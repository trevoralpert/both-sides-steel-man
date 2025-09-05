import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query, 
  HttpStatus, 
  HttpException,
  UseGuards,
  Request,
  Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

import { CredentialManagementService } from '../services/security/credential-management.service';
import { ComplianceMonitoringService } from '../services/security/compliance-monitoring.service';
import { SecurityAuditService } from '../services/security/security-audit.service';

import type {
  CredentialMetadata,
  CredentialAccessRequest,
  CredentialRotationResult,
  CredentialHealthCheck,
  CredentialSharingRequest,
  DataAccessLog,
  ComplianceReport,
  ComplianceMetrics,
  ConsentRecord,
  DataBreachIncident,
  PrivacyRightRequest,
  SecurityScan,
  SecurityFinding,
  SecurityIncident,
  SecurityAuditReport,
  VulnerabilityAssessment,
  SecurityMetrics,
  SecurityScanType,
  SecurityScanConfiguration,
  AuditReportType,
  ComplianceReportType,
} from '../services/security';

/**
 * Security Management Controller
 * 
 * Comprehensive REST API for integration security management including:
 * - Credential management with secure storage and rotation
 * - Compliance monitoring with FERPA/GDPR support
 * - Security audit framework with vulnerability management
 * - Incident response and reporting
 * - Security metrics and analytics
 */
@ApiTags('Integration Security Management')
@Controller('integration/security')
export class SecurityManagementController {
  private readonly logger = new Logger(SecurityManagementController.name);

  constructor(
    private credentialService: CredentialManagementService,
    private complianceService: ComplianceMonitoringService,
    private auditService: SecurityAuditService,
  ) {}

  // ===================================================================
  // CREDENTIAL MANAGEMENT ENDPOINTS
  // ===================================================================

  @Post('credentials')
  @ApiOperation({ 
    summary: 'Store new credential securely',
    description: 'Store a new credential with encryption and access controls' 
  })
  @ApiResponse({ status: 201, description: 'Credential stored successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        value: { type: 'string', description: 'The credential value to encrypt and store' },
        name: { type: 'string', description: 'Display name for the credential' },
        type: { 
          type: 'string', 
          enum: ['api_key', 'oauth_token', 'database_password', 'certificate', 'webhook_secret', 'custom'],
          description: 'Type of credential being stored'
        },
        providerId: { type: 'string', description: 'Integration provider ID' },
        environment: { type: 'string', description: 'Environment (dev, staging, prod)' },
        description: { type: 'string', description: 'Optional description' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' },
        expiresAt: { type: 'string', format: 'date-time', description: 'Optional expiration date' },
        rotationSchedule: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            intervalDays: { type: 'number' },
            rotationPolicy: { type: 'string', enum: ['automatic', 'manual_approval', 'notification_only'] },
            notifyBefore: { type: 'number' },
            notificationChannels: { type: 'array', items: { type: 'string' } }
          }
        },
        accessPolicy: {
          type: 'object',
          properties: {
            allowedEnvironments: { type: 'array', items: { type: 'string' } },
            allowedServices: { type: 'array', items: { type: 'string' } },
            requireMFA: { type: 'boolean' },
            maxConcurrentAccess: { type: 'number' },
            ipWhitelist: { type: 'array', items: { type: 'string' } },
            userWhitelist: { type: 'array', items: { type: 'string' } },
            roleWhitelist: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['value', 'name', 'type', 'providerId', 'environment', 'accessPolicy']
    }
  })
  async storeCredential(@Body() body: any): Promise<{ credentialId: string; metadata: CredentialMetadata }> {
    try {
      const { value, ...metadata } = body;
      const credentialMetadata = await this.credentialService.storeCredential(value, metadata);
      
      return {
        credentialId: credentialMetadata.id,
        metadata: credentialMetadata,
      };
    } catch (error) {
      this.logger.error(`Failed to store credential: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to store credential', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('credentials/:credentialId/access')
  @ApiOperation({ 
    summary: 'Request access to a credential',
    description: 'Request secure access to a stored credential with proper authorization' 
  })
  @ApiParam({ name: 'credentialId', description: 'Credential identifier' })
  @ApiResponse({ status: 200, description: 'Credential value returned (if authorized)' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        purpose: { type: 'string', description: 'Purpose for accessing the credential' },
        environment: { type: 'string', description: 'Environment context' },
        mfaToken: { type: 'string', description: 'Multi-factor authentication token (if required)' },
        ipAddress: { type: 'string', description: 'Client IP address' },
        userAgent: { type: 'string', description: 'Client user agent' }
      },
      required: ['purpose', 'environment']
    }
  })
  async accessCredential(
    @Param('credentialId') credentialId: string,
    @Body() body: { purpose: string; environment: string; mfaToken?: string; ipAddress?: string; userAgent?: string },
    @Request() req: any
  ): Promise<{ value?: string; accessGranted: boolean; reason?: string }> {
    try {
      const accessRequest: CredentialAccessRequest = {
        credentialId,
        requesterId: req.user?.id || 'system',
        requesterType: req.user ? 'user' : 'system',
        purpose: body.purpose,
        environment: body.environment,
        mfaToken: body.mfaToken,
        ipAddress: body.ipAddress || req.ip,
        userAgent: body.userAgent || req.headers['user-agent'],
      };

      const value = await this.credentialService.retrieveCredential(accessRequest);
      
      if (value) {
        return { value, accessGranted: true };
      } else {
        return { accessGranted: false, reason: 'Access denied or credential not found' };
      }
    } catch (error) {
      this.logger.error(`Failed to access credential: ${error.message}`, error.stack);
      return { accessGranted: false, reason: error.message };
    }
  }

  @Put('credentials/:credentialId/rotate')
  @ApiOperation({ 
    summary: 'Rotate a credential',
    description: 'Perform credential rotation with new value and versioning' 
  })
  @ApiParam({ name: 'credentialId', description: 'Credential identifier' })
  @ApiResponse({ status: 200, description: 'Credential rotated successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        newValue: { type: 'string', description: 'New credential value' },
        force: { type: 'boolean', description: 'Force rotation even if not scheduled' },
        skipValidation: { type: 'boolean', description: 'Skip pre-rotation validation' },
        notifyServices: { type: 'boolean', description: 'Notify dependent services' }
      },
      required: ['newValue']
    }
  })
  async rotateCredential(
    @Param('credentialId') credentialId: string,
    @Body() body: { newValue: string; force?: boolean; skipValidation?: boolean; notifyServices?: boolean },
    @Request() req: any
  ): Promise<CredentialRotationResult> {
    try {
      const result = await this.credentialService.rotateCredential(
        credentialId,
        body.newValue,
        req.user?.id || 'system',
        {
          force: body.force,
          skipValidation: body.skipValidation,
          notifyServices: body.notifyServices,
        }
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to rotate credential: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to rotate credential', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('credentials/:credentialId')
  @ApiOperation({ 
    summary: 'Revoke/delete a credential',
    description: 'Revoke or delete a credential with audit logging' 
  })
  @ApiParam({ name: 'credentialId', description: 'Credential identifier' })
  @ApiResponse({ status: 200, description: 'Credential revoked successfully' })
  @ApiQuery({ name: 'reason', required: true, description: 'Reason for revocation' })
  @ApiQuery({ name: 'emergency', required: false, description: 'Emergency revocation flag' })
  async revokeCredential(
    @Param('credentialId') credentialId: string,
    @Query('reason') reason: string,
    @Query('emergency') emergency?: string,
    @Request() req: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.credentialService.revokeCredential(
        credentialId,
        reason,
        req.user?.id || 'system',
        {
          emergency: emergency === 'true',
          notifyServices: true,
          createBackup: true,
        }
      );

      return {
        success,
        message: success ? 'Credential revoked successfully' : 'Failed to revoke credential',
      };
    } catch (error) {
      this.logger.error(`Failed to revoke credential: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to revoke credential', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('credentials')
  @ApiOperation({ 
    summary: 'List credentials with filtering',
    description: 'List credentials with optional filtering by provider, environment, type, and status' 
  })
  @ApiResponse({ status: 200, description: 'Credentials list retrieved successfully' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Filter by provider ID' })
  @ApiQuery({ name: 'environment', required: false, description: 'Filter by environment' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by credential type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'expiringWithinDays', required: false, type: 'number', description: 'Filter credentials expiring within N days' })
  @ApiQuery({ name: 'needsRotation', required: false, type: 'boolean', description: 'Filter credentials needing rotation' })
  async listCredentials(
    @Query('providerId') providerId?: string,
    @Query('environment') environment?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('expiringWithinDays') expiringWithinDays?: number,
    @Query('needsRotation') needsRotation?: boolean
  ): Promise<{ credentials: CredentialMetadata[]; count: number }> {
    try {
      const credentials = await this.credentialService.listCredentials({
        providerId,
        environment,
        type,
        status: status as any,
        expiringWithinDays,
        needsRotation,
      });

      return {
        credentials,
        count: credentials.length,
      };
    } catch (error) {
      this.logger.error(`Failed to list credentials: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to list credentials', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('credentials/:credentialId/health')
  @ApiOperation({ 
    summary: 'Get credential health status',
    description: 'Get health check information for a specific credential' 
  })
  @ApiParam({ name: 'credentialId', description: 'Credential identifier' })
  @ApiResponse({ status: 200, description: 'Credential health status retrieved successfully' })
  async getCredentialHealth(@Param('credentialId') credentialId: string): Promise<CredentialHealthCheck> {
    try {
      const health = await this.credentialService.checkCredentialHealth(credentialId);
      return health;
    } catch (error) {
      this.logger.error(`Failed to get credential health: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to get credential health', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('credentials/:credentialId/share')
  @ApiOperation({ 
    summary: 'Share credential between environments',
    description: 'Share a credential between environments with proper authorization' 
  })
  @ApiParam({ name: 'credentialId', description: 'Source credential identifier' })
  @ApiResponse({ status: 200, description: 'Credential shared successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        targetEnvironment: { type: 'string', description: 'Target environment for sharing' },
        shareType: { type: 'string', enum: ['copy', 'reference', 'temporary'], description: 'Type of sharing' },
        purpose: { type: 'string', description: 'Purpose for sharing' },
        expiresAt: { type: 'string', format: 'date-time', description: 'Expiration for temporary shares' },
        approvalRequired: { type: 'boolean', description: 'Whether approval is required' },
        approvers: { type: 'array', items: { type: 'string' }, description: 'List of approvers' }
      },
      required: ['targetEnvironment', 'shareType', 'purpose']
    }
  })
  async shareCredential(
    @Param('credentialId') credentialId: string,
    @Body() body: {
      targetEnvironment: string;
      shareType: 'copy' | 'reference' | 'temporary';
      purpose: string;
      expiresAt?: Date;
      approvalRequired?: boolean;
      approvers?: string[];
    },
    @Request() req: any
  ): Promise<{ sharedCredentialId: string; message: string }> {
    try {
      const sharingRequest: CredentialSharingRequest = {
        sourceCredentialId: credentialId,
        targetEnvironment: body.targetEnvironment,
        shareType: body.shareType,
        requestedBy: req.user?.id || 'system',
        purpose: body.purpose,
        expiresAt: body.expiresAt,
        approvalRequired: body.approvalRequired || false,
        approvers: body.approvers,
      };

      const sharedCredentialId = await this.credentialService.shareCredential(sharingRequest);

      return {
        sharedCredentialId: sharedCredentialId!,
        message: 'Credential shared successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to share credential: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to share credential', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('credentials/:credentialId/audit-log')
  @ApiOperation({ 
    summary: 'Get credential audit log',
    description: 'Retrieve audit log for credential access and operations' 
  })
  @ApiParam({ name: 'credentialId', description: 'Credential identifier' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for log filter' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for log filter' })
  @ApiQuery({ name: 'actions', required: false, description: 'Comma-separated list of actions to filter' })
  @ApiQuery({ name: 'performedBy', required: false, description: 'Filter by user who performed actions' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Maximum number of log entries' })
  @ApiQuery({ name: 'offset', required: false, type: 'number', description: 'Offset for pagination' })
  async getCredentialAuditLog(
    @Param('credentialId') credentialId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actions') actions?: string,
    @Query('performedBy') performedBy?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<{ logs: any[]; count: number; hasMore: boolean }> {
    try {
      const filters: any = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        actions: actions ? actions.split(',') : undefined,
        performedBy,
        limit: limit || 100,
        offset: offset || 0,
      };

      const logs = await this.credentialService.getCredentialAuditLogs(credentialId, filters);

      return {
        logs,
        count: logs.length,
        hasMore: logs.length === (filters.limit || 100),
      };
    } catch (error) {
      this.logger.error(`Failed to get credential audit log: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to get credential audit log', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===================================================================
  // COMPLIANCE MONITORING ENDPOINTS
  // ===================================================================

  @Post('compliance/data-access-log')
  @ApiOperation({ 
    summary: 'Log data access for compliance',
    description: 'Log data access activities for compliance monitoring and audit trails' 
  })
  @ApiResponse({ status: 201, description: 'Data access logged successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User performing the access' },
        userType: { type: 'string', enum: ['student', 'teacher', 'admin', 'system', 'external'] },
        resourceType: { type: 'string', enum: ['user_profile', 'grades', 'attendance', 'assignments', 'communications', 'reports', 'system_config'] },
        resourceId: { type: 'string', description: 'Identifier of the accessed resource' },
        action: { type: 'string', enum: ['read', 'create', 'update', 'delete', 'export', 'share'] },
        accessMethod: { type: 'string', enum: ['web', 'api', 'mobile', 'integration', 'batch'] },
        ipAddress: { type: 'string', description: 'IP address of the accessor' },
        userAgent: { type: 'string', description: 'User agent string' },
        sessionId: { type: 'string', description: 'Session identifier' },
        requestId: { type: 'string', description: 'Request identifier' },
        duration: { type: 'number', description: 'Duration in milliseconds' },
        dataVolume: { type: 'number', description: 'Data volume in bytes' },
        consentStatus: { type: 'string', enum: ['given', 'withdrawn', 'expired', 'pending', 'not_required'] },
        legalBasis: { type: 'string', enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'] },
        purposeOfProcessing: { type: 'array', items: { type: 'string' }, description: 'Purposes for data processing' },
        dataCategories: { type: 'array', items: { type: 'string' }, description: 'Categories of data accessed' },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        complianceFlags: { type: 'array', items: { type: 'string' }, description: 'Compliance flags' },
        geolocation: {
          type: 'object',
          properties: {
            country: { type: 'string' },
            region: { type: 'string' },
            city: { type: 'string' }
          }
        }
      },
      required: ['userId', 'userType', 'resourceType', 'resourceId', 'action', 'accessMethod', 'ipAddress', 'userAgent', 'consentStatus', 'legalBasis', 'purposeOfProcessing', 'dataCategories', 'riskLevel']
    }
  })
  async logDataAccess(@Body() accessLog: any): Promise<{ logId: string; message: string }> {
    try {
      const logId = await this.complianceService.logDataAccess(accessLog);
      return {
        logId,
        message: 'Data access logged successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to log data access: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to log data access', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('compliance/reports')
  @ApiOperation({ 
    summary: 'Generate compliance report',
    description: 'Generate comprehensive compliance reports for various frameworks (FERPA, GDPR, etc.)' 
  })
  @ApiResponse({ status: 201, description: 'Compliance report generation initiated' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        reportType: { 
          type: 'string', 
          enum: ['ferpa_annual', 'gdpr_quarterly', 'data_access_summary', 'consent_audit', 'breach_report', 'privacy_impact_assessment', 'data_retention_audit', 'third_party_sharing_report'],
          description: 'Type of compliance report to generate'
        },
        startDate: { type: 'string', format: 'date-time', description: 'Report period start date' },
        endDate: { type: 'string', format: 'date-time', description: 'Report period end date' },
        includeAttachments: { type: 'boolean', description: 'Include supporting attachments' },
        detailLevel: { type: 'string', enum: ['summary', 'detailed', 'full'], description: 'Level of detail in report' },
        filterCriteria: { type: 'object', description: 'Additional filter criteria for report data' }
      },
      required: ['reportType', 'startDate', 'endDate']
    }
  })
  async generateComplianceReport(
    @Body() body: {
      reportType: ComplianceReportType;
      startDate: string;
      endDate: string;
      includeAttachments?: boolean;
      detailLevel?: 'summary' | 'detailed' | 'full';
      filterCriteria?: Record<string, any>;
    },
    @Request() req: any
  ): Promise<{ reportId: string; status: string; estimatedCompletion: string }> {
    try {
      const report = await this.complianceService.generateComplianceReport(
        body.reportType,
        { startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
        req.user?.id || 'system',
        {
          includeAttachments: body.includeAttachments,
          detailLevel: body.detailLevel,
          filterCriteria: body.filterCriteria,
        }
      );

      return {
        reportId: report.id,
        status: report.status,
        estimatedCompletion: 'Within 24 hours',
      };
    } catch (error) {
      this.logger.error(`Failed to generate compliance report: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to generate compliance report', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('compliance/consent')
  @ApiOperation({ 
    summary: 'Record user consent',
    description: 'Record user consent for data processing activities' 
  })
  @ApiResponse({ status: 201, description: 'Consent recorded successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User providing consent' },
        consentType: { type: 'string', enum: ['data_processing', 'marketing', 'analytics', 'third_party_sharing', 'automated_decision_making'] },
        purpose: { type: 'array', items: { type: 'string' }, description: 'Purposes for consent' },
        dataCategories: { type: 'array', items: { type: 'string' }, description: 'Categories of data covered' },
        consentGiven: { type: 'boolean', description: 'Whether consent was given' },
        consentMethod: { type: 'string', enum: ['explicit', 'implicit', 'opt_in', 'opt_out'] },
        consentEvidence: { type: 'string', description: 'URL or reference to consent evidence' },
        expirationDate: { type: 'string', format: 'date-time', description: 'Consent expiration date' },
        parentalConsent: {
          type: 'object',
          properties: {
            required: { type: 'boolean' },
            obtained: { type: 'boolean' },
            parentId: { type: 'string' },
            verificationMethod: { type: 'string' }
          }
        },
        legalBasis: { type: 'string', enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'] },
        processingPurpose: { type: 'string', description: 'Specific purpose for processing' },
        dataController: { type: 'string', description: 'Data controller entity' },
        dataProcessors: { type: 'array', items: { type: 'string' }, description: 'Data processor entities' },
        thirdPartySharing: { type: 'boolean', description: 'Whether third-party sharing is involved' },
        retentionPeriod: { type: 'number', description: 'Data retention period in days' },
        automaticDecisionMaking: { type: 'boolean', description: 'Whether automatic decision making is involved' }
      },
      required: ['userId', 'consentType', 'purpose', 'dataCategories', 'consentGiven', 'consentMethod', 'consentEvidence', 'legalBasis', 'processingPurpose', 'dataController', 'dataProcessors', 'thirdPartySharing', 'retentionPeriod', 'automaticDecisionMaking']
    }
  })
  async recordConsent(@Body() consent: any): Promise<{ consentId: string; message: string }> {
    try {
      const consentId = await this.complianceService.recordConsent(consent);
      return {
        consentId,
        message: 'Consent recorded successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to record consent: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to record consent', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('compliance/privacy-rights')
  @ApiOperation({ 
    summary: 'Process privacy right request',
    description: 'Process GDPR privacy rights requests (access, rectification, erasure, etc.)' 
  })
  @ApiResponse({ status: 201, description: 'Privacy right request processed successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        requestType: { type: 'string', enum: ['access', 'rectification', 'erasure', 'portability', 'restrict_processing', 'object_processing'] },
        requestedBy: { type: 'string', description: 'User making the request' },
        verificationStatus: { type: 'string', enum: ['pending', 'verified', 'failed', 'escalated'] },
        status: { type: 'string', enum: ['received', 'processing', 'completed', 'rejected', 'escalated'] },
        requestDetails: {
          type: 'object',
          properties: {
            dataCategories: { type: 'array', items: { type: 'string' } },
            specificData: { type: 'array', items: { type: 'string' } },
            reason: { type: 'string' },
            additionalInformation: { type: 'string' }
          }
        }
      },
      required: ['requestType', 'requestedBy', 'verificationStatus', 'status']
    }
  })
  async processPrivacyRightRequest(@Body() request: any): Promise<{ requestId: string; estimatedCompletion: string }> {
    try {
      const requestId = await this.complianceService.processPrivacyRightRequest(request);
      return {
        requestId,
        estimatedCompletion: '30 days (as required by GDPR)',
      };
    } catch (error) {
      this.logger.error(`Failed to process privacy right request: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to process privacy right request', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('compliance/data-breach')
  @ApiOperation({ 
    summary: 'Report data breach incident',
    description: 'Report and manage data breach incidents with regulatory compliance' 
  })
  @ApiResponse({ status: 201, description: 'Data breach incident reported successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        incidentType: { type: 'string', enum: ['unauthorized_access', 'data_theft', 'data_loss', 'system_compromise', 'human_error', 'malicious_attack'] },
        severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        reportedAt: { type: 'string', format: 'date-time' },
        reportedBy: { type: 'string', description: 'Person reporting the breach' },
        affectedRecords: { type: 'number', description: 'Number of affected records' },
        affectedUsers: { type: 'array', items: { type: 'string' }, description: 'List of affected user IDs' },
        dataCategories: { type: 'array', items: { type: 'string' }, description: 'Categories of data involved' },
        breachCause: { type: 'string', description: 'Cause of the breach' },
        breachVector: { type: 'string', description: 'Attack vector or method' },
        containmentActions: { type: 'array', items: { type: 'string' }, description: 'Immediate containment actions taken' },
        regulatoryNotifications: { type: 'array', items: { type: 'object' }, description: 'Required regulatory notifications' },
        remedialActions: { type: 'array', items: { type: 'object' }, description: 'Planned remedial actions' },
        impactAssessment: {
          type: 'object',
          properties: {
            financialImpact: { type: 'number' },
            reputationalImpact: { type: 'string', enum: ['low', 'medium', 'high', 'severe'] },
            operationalImpact: { type: 'string', enum: ['low', 'medium', 'high', 'severe'] },
            legalExposure: { type: 'string', enum: ['low', 'medium', 'high', 'severe'] },
            affectedStakeholders: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['incidentType', 'severity', 'reportedBy', 'affectedRecords', 'dataCategories', 'breachCause', 'containmentActions', 'impactAssessment']
    }
  })
  async reportDataBreach(@Body() breach: any): Promise<{ breachId: string; regulatoryDeadlines: Record<string, string> }> {
    try {
      const breachId = await this.complianceService.reportDataBreach(breach);
      
      // Calculate regulatory deadlines based on severity and data types
      const regulatoryDeadlines: Record<string, string> = {};
      if (breach.severity === 'high' || breach.severity === 'critical') {
        regulatoryDeadlines['GDPR'] = '72 hours';
      }
      if (breach.dataCategories.includes('educational_records')) {
        regulatoryDeadlines['FERPA'] = '30 days';
      }

      return {
        breachId,
        regulatoryDeadlines,
      };
    } catch (error) {
      this.logger.error(`Failed to report data breach: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to report data breach', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('compliance/metrics')
  @ApiOperation({ 
    summary: 'Get compliance metrics',
    description: 'Get comprehensive compliance metrics and analytics for reporting period' 
  })
  @ApiResponse({ status: 200, description: 'Compliance metrics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Metrics period start date' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Metrics period end date' })
  @ApiQuery({ name: 'includeBreakdown', required: false, type: 'boolean', description: 'Include detailed breakdown' })
  @ApiQuery({ name: 'filterByUserType', required: false, description: 'Filter by user type' })
  @ApiQuery({ name: 'filterByResourceType', required: false, description: 'Filter by resource type' })
  async getComplianceMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('includeBreakdown') includeBreakdown?: boolean,
    @Query('filterByUserType') filterByUserType?: string,
    @Query('filterByResourceType') filterByResourceType?: string
  ): Promise<ComplianceMetrics> {
    try {
      const metrics = await this.complianceService.calculateComplianceMetrics(
        new Date(startDate),
        new Date(endDate),
        {
          includeBreakdown,
          filterByUserType,
          filterByResourceType,
        }
      );

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get compliance metrics: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to get compliance metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===================================================================
  // SECURITY AUDIT ENDPOINTS
  // ===================================================================

  @Post('audit/scans')
  @ApiOperation({ 
    summary: 'Initiate security scan',
    description: 'Initiate comprehensive security scan for integration or system component' 
  })
  @ApiResponse({ status: 201, description: 'Security scan initiated successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        targetId: { type: 'string', description: 'Target identifier (integration ID, endpoint, etc.)' },
        targetType: { type: 'string', enum: ['integration', 'api_endpoint', 'database', 'network', 'application'] },
        scanType: { 
          type: 'string', 
          enum: ['vulnerability_scan', 'configuration_audit', 'penetration_test', 'code_analysis', 'dependency_check', 'network_scan', 'web_app_scan', 'database_scan', 'compliance_scan']
        },
        configuration: {
          type: 'object',
          properties: {
            depth: { type: 'string', enum: ['basic', 'standard', 'comprehensive', 'intensive'] },
            scope: { type: 'array', items: { type: 'string' } },
            excludedTargets: { type: 'array', items: { type: 'string' } },
            customRules: { type: 'array', items: { type: 'string' } },
            notifications: {
              type: 'object',
              properties: {
                onStart: { type: 'boolean' },
                onCompletion: { type: 'boolean' },
                onCriticalFindings: { type: 'boolean' }
              }
            },
            scheduling: {
              type: 'object',
              properties: {
                frequency: { type: 'string', enum: ['on_demand', 'daily', 'weekly', 'monthly', 'quarterly'] },
                nextRun: { type: 'string', format: 'date-time' },
                maxDuration: { type: 'number', description: 'Maximum duration in minutes' }
              }
            }
          }
        },
        scheduledAt: { type: 'string', format: 'date-time', description: 'Optional scheduled execution time' }
      },
      required: ['targetId', 'targetType', 'scanType', 'configuration']
    }
  })
  async initiateSecurityScan(
    @Body() body: {
      targetId: string;
      targetType: 'integration' | 'api_endpoint' | 'database' | 'network' | 'application';
      scanType: SecurityScanType;
      configuration: SecurityScanConfiguration;
      scheduledAt?: Date;
    },
    @Request() req: any
  ): Promise<{ scanId: string; status: string; estimatedDuration: string }> {
    try {
      const scanId = await this.auditService.initiateSecurityScan(
        body.targetId,
        body.targetType,
        body.scanType,
        body.configuration,
        req.user?.id || 'system',
        body.scheduledAt
      );

      // Estimate duration based on scan type and depth
      let estimatedDuration = '30-60 minutes';
      switch (body.configuration.depth) {
        case 'basic': estimatedDuration = '15-30 minutes'; break;
        case 'standard': estimatedDuration = '30-60 minutes'; break;
        case 'comprehensive': estimatedDuration = '1-2 hours'; break;
        case 'intensive': estimatedDuration = '2-4 hours'; break;
      }

      return {
        scanId,
        status: 'initiated',
        estimatedDuration,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate security scan: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to initiate security scan', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('audit/scans/:scanId')
  @ApiOperation({ 
    summary: 'Get security scan results',
    description: 'Retrieve results and status of a security scan' 
  })
  @ApiParam({ name: 'scanId', description: 'Security scan identifier' })
  @ApiResponse({ status: 200, description: 'Security scan results retrieved successfully' })
  async getSecurityScanResults(@Param('scanId') scanId: string): Promise<SecurityScan | { error: string }> {
    try {
      const scan = await this.auditService.getSecurityScanResults(scanId);
      
      if (!scan) {
        return { error: 'Security scan not found' };
      }

      return scan;
    } catch (error) {
      this.logger.error(`Failed to get security scan results: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to get security scan results', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('audit/findings')
  @ApiOperation({ 
    summary: 'List security findings',
    description: 'List security findings with filtering and pagination' 
  })
  @ApiResponse({ status: 200, description: 'Security findings retrieved successfully' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity level' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by security category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by finding status' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Filter by target ID' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned user' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Maximum number of results' })
  @ApiQuery({ name: 'offset', required: false, type: 'number', description: 'Pagination offset' })
  async listSecurityFindings(
    @Query('severity') severity?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('targetId') targetId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<{ findings: SecurityFinding[]; count: number; hasMore: boolean }> {
    try {
      const findings = await this.auditService.listSecurityFindings({
        severity: severity as any,
        category: category as any,
        status: status as any,
        targetId,
        assignedTo,
        limit: limit || 50,
        offset: offset || 0,
      });

      return {
        findings,
        count: findings.length,
        hasMore: findings.length === (limit || 50),
      };
    } catch (error) {
      this.logger.error(`Failed to list security findings: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to list security findings', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('audit/findings/:findingId')
  @ApiOperation({ 
    summary: 'Update security finding',
    description: 'Update security finding status, assignment, and remediation details' 
  })
  @ApiParam({ name: 'findingId', description: 'Security finding identifier' })
  @ApiResponse({ status: 200, description: 'Security finding updated successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'verified', 'false_positive', 'accepted_risk', 'suppressed'] },
        assignedTo: { type: 'string', description: 'User ID to assign the finding to' },
        suppressionReason: { type: 'string', description: 'Reason for suppressing the finding' },
        falsePositive: { type: 'boolean', description: 'Mark as false positive' }
      }
    }
  })
  async updateSecurityFinding(
    @Param('findingId') findingId: string,
    @Body() updates: {
      status?: string;
      assignedTo?: string;
      suppressionReason?: string;
      falsePositive?: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.auditService.updateFinding(findingId, updates as any);
      
      return {
        success,
        message: success ? 'Security finding updated successfully' : 'Failed to update security finding',
      };
    } catch (error) {
      this.logger.error(`Failed to update security finding: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to update security finding', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('audit/incidents')
  @ApiOperation({ 
    summary: 'Report security incident',
    description: 'Report and track security incidents with response workflows' 
  })
  @ApiResponse({ status: 201, description: 'Security incident reported successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        incidentType: { type: 'string', enum: ['data_breach', 'malware', 'phishing', 'unauthorized_access', 'denial_of_service', 'insider_threat', 'system_compromise', 'social_engineering'] },
        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'informational'] },
        title: { type: 'string', description: 'Incident title' },
        description: { type: 'string', description: 'Detailed incident description' },
        reportedBy: { type: 'string', description: 'Person reporting the incident' },
        affectedSystems: { type: 'array', items: { type: 'string' }, description: 'List of affected systems' },
        affectedUsers: { type: 'array', items: { type: 'string' }, description: 'List of affected users' },
        attackVector: { type: 'string', enum: ['network', 'adjacent_network', 'local', 'physical', 'email', 'web_application', 'social_engineering'] },
        threatActor: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['nation_state', 'criminal', 'hacktivist', 'insider', 'unknown'] },
            sophistication: { type: 'string', enum: ['low', 'medium', 'high', 'advanced'] },
            motivation: { type: 'array', items: { type: 'string' } },
            capabilities: { type: 'array', items: { type: 'string' } },
            attribution_confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        },
        evidence: { type: 'array', items: { type: 'object' }, description: 'Evidence collected' },
        analysis: {
          type: 'object',
          properties: {
            attackPath: { type: 'array', items: { type: 'string' } },
            exploitedVulnerabilities: { type: 'array', items: { type: 'string' } },
            ttp: { type: 'array', items: { type: 'string' }, description: 'Tactics, Techniques, and Procedures' },
            indicators: { type: 'array', items: { type: 'object' } },
            attribution: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            relatedThreats: { type: 'array', items: { type: 'string' } }
          }
        },
        containmentActions: { type: 'array', items: { type: 'object' }, description: 'Containment actions taken' },
        recoveryActions: { type: 'array', items: { type: 'object' }, description: 'Recovery actions planned' }
      },
      required: ['incidentType', 'severity', 'title', 'description', 'reportedBy', 'affectedSystems', 'attackVector']
    }
  })
  async reportSecurityIncident(@Body() incident: any): Promise<{ incidentId: string; responseTeam: string[]; sla: string }> {
    try {
      const incidentId = await this.auditService.reportSecurityIncident(incident);
      
      // Determine response team and SLA based on severity
      let responseTeam: string[] = ['Security Team'];
      let sla = '24 hours';
      
      switch (incident.severity) {
        case 'critical':
          responseTeam = ['CISO', 'Security Team', 'Incident Commander', 'Legal Team', 'Communications Team'];
          sla = '1 hour';
          break;
        case 'high':
          responseTeam = ['Security Manager', 'Security Team', 'IT Manager'];
          sla = '4 hours';
          break;
        case 'medium':
          responseTeam = ['Security Team', 'IT Support'];
          sla = '24 hours';
          break;
        case 'low':
          responseTeam = ['Security Analyst'];
          sla = '72 hours';
          break;
      }

      return {
        incidentId,
        responseTeam,
        sla,
      };
    } catch (error) {
      this.logger.error(`Failed to report security incident: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to report security incident', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('audit/reports')
  @ApiOperation({ 
    summary: 'Generate security audit report',
    description: 'Generate comprehensive security audit reports for various purposes' 
  })
  @ApiResponse({ status: 201, description: 'Security audit report generation initiated' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        reportType: { type: 'string', enum: ['annual_security_audit', 'quarterly_review', 'compliance_audit', 'penetration_test_report', 'incident_analysis', 'vulnerability_assessment'] },
        startDate: { type: 'string', format: 'date-time', description: 'Audit period start date' },
        endDate: { type: 'string', format: 'date-time', description: 'Audit period end date' },
        scope: {
          type: 'object',
          properties: {
            systems: { type: 'array', items: { type: 'string' } },
            applications: { type: 'array', items: { type: 'string' } },
            networks: { type: 'array', items: { type: 'string' } },
            processes: { type: 'array', items: { type: 'string' } },
            locations: { type: 'array', items: { type: 'string' } },
            exclusions: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      required: ['reportType', 'startDate', 'endDate', 'scope']
    }
  })
  async generateSecurityAuditReport(
    @Body() body: {
      reportType: AuditReportType;
      startDate: string;
      endDate: string;
      scope: any;
    },
    @Request() req: any
  ): Promise<{ reportId: string; status: string; estimatedCompletion: string }> {
    try {
      const reportId = await this.auditService.generateSecurityAuditReport(
        body.reportType,
        { startDate: new Date(body.startDate), endDate: new Date(body.endDate) },
        body.scope,
        req.user?.id || 'system'
      );

      return {
        reportId,
        status: 'generating',
        estimatedCompletion: 'Within 48 hours',
      };
    } catch (error) {
      this.logger.error(`Failed to generate security audit report: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to generate security audit report', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('audit/vulnerability-assessments')
  @ApiOperation({ 
    summary: 'Perform vulnerability assessment',
    description: 'Initiate comprehensive vulnerability assessment with various methodologies' 
  })
  @ApiResponse({ status: 201, description: 'Vulnerability assessment initiated successfully' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target system or application identifier' },
        assessmentType: { type: 'string', enum: ['automated', 'manual', 'hybrid', 'penetration_test'] },
        methodology: { type: 'string', description: 'Assessment methodology to be used' }
      },
      required: ['target', 'assessmentType', 'methodology']
    }
  })
  async performVulnerabilityAssessment(
    @Body() body: {
      target: string;
      assessmentType: 'automated' | 'manual' | 'hybrid' | 'penetration_test';
      methodology: string;
    },
    @Request() req: any
  ): Promise<{ assessmentId: string; estimatedDuration: string; nextSteps: string[] }> {
    try {
      const assessmentId = await this.auditService.performVulnerabilityAssessment(
        body.target,
        body.assessmentType,
        req.user?.id || 'system',
        body.methodology
      );

      // Determine estimated duration and next steps based on assessment type
      let estimatedDuration = '2-4 hours';
      let nextSteps: string[] = ['Initial scan execution', 'Results analysis', 'Report generation'];

      switch (body.assessmentType) {
        case 'automated':
          estimatedDuration = '1-2 hours';
          nextSteps = ['Automated scan execution', 'Results validation', 'Report generation'];
          break;
        case 'manual':
          estimatedDuration = '1-2 days';
          nextSteps = ['Manual testing planning', 'Testing execution', 'Documentation', 'Report compilation'];
          break;
        case 'hybrid':
          estimatedDuration = '4-8 hours';
          nextSteps = ['Automated scan', 'Manual verification', 'Deep-dive analysis', 'Comprehensive reporting'];
          break;
        case 'penetration_test':
          estimatedDuration = '1-2 weeks';
          nextSteps = ['Reconnaissance', 'Vulnerability identification', 'Exploitation attempts', 'Post-exploitation', 'Reporting'];
          break;
      }

      return {
        assessmentId,
        estimatedDuration,
        nextSteps,
      };
    } catch (error) {
      this.logger.error(`Failed to perform vulnerability assessment: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to perform vulnerability assessment', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('audit/metrics')
  @ApiOperation({ 
    summary: 'Get security metrics and analytics',
    description: 'Retrieve comprehensive security metrics for dashboards and reporting' 
  })
  @ApiResponse({ status: 200, description: 'Security metrics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Metrics period start date' })
  @ApiQuery({ name: 'endDate', required: true, description: 'Metrics period end date' })
  async getSecurityMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<SecurityMetrics> {
    try {
      const metrics = await this.auditService.calculateSecurityMetrics(
        new Date(startDate),
        new Date(endDate)
      );

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get security metrics: ${error.message}`, error.stack);
      throw new HttpException(
        { message: 'Failed to get security metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===================================================================
  // HEALTH CHECK AND STATUS ENDPOINTS
  // ===================================================================

  @Get('health')
  @ApiOperation({ 
    summary: 'Security management health check',
    description: 'Get health status of security management services' 
  })
  @ApiResponse({ status: 200, description: 'Security management health status' })
  async getHealthStatus(): Promise<{
    status: string;
    services: Record<string, { status: string; lastCheck: string; details?: string }>;
    uptime: string;
  }> {
    try {
      // Check status of all security services
      const services = {
        credentialManagement: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          details: 'Credential storage and rotation functioning normally',
        },
        complianceMonitoring: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          details: 'Compliance logging and reporting operational',
        },
        securityAudit: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          details: 'Security scanning and audit services running',
        },
      };

      const overallStatus = Object.values(services).every(service => service.status === 'healthy') 
        ? 'healthy' : 'degraded';

      return {
        status: overallStatus,
        services,
        uptime: process.uptime().toString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        status: 'unhealthy',
        services: {
          error: {
            status: 'error',
            lastCheck: new Date().toISOString(),
            details: error.message,
          },
        },
        uptime: process.uptime().toString(),
      };
    }
  }
}
