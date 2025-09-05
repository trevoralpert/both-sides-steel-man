/**
 * Security Services Index
 * 
 * Central exports for all integration security services including credential management,
 * compliance monitoring, and security audit frameworks.
 */

// ===================================================================
// CORE SECURITY SERVICES
// ===================================================================

export { CredentialManagementService } from './credential-management.service';
export { ComplianceMonitoringService } from './compliance-monitoring.service';
export { SecurityAuditService } from './security-audit.service';

// ===================================================================
// TYPES AND INTERFACES - CREDENTIAL MANAGEMENT
// ===================================================================

export type {
  CredentialMetadata,
  EncryptedCredential,
  CredentialRotationSchedule,
  CredentialAccessPolicy,
  CredentialStatus,
  CredentialAccessRequest,
  CredentialAccessGrant,
  CredentialAuditLog,
  CredentialRotationResult,
  CredentialHealthCheck,
  CredentialSharingRequest,
  CredentialBackup,
} from './credential-management.service';

// ===================================================================
// TYPES AND INTERFACES - COMPLIANCE MONITORING
// ===================================================================

export type {
  DataAccessLog,
  ComplianceReport,
  ComplianceFinding,
  ConsentRecord,
  DataBreachIncident,
  PrivacyRightRequest,
  ComplianceMetrics,
  ComplianceReportType,
  ConsentStatus,
  LegalBasis,
  DataCategory,
  RiskLevel,
  ComplianceFlag,
  ConsentType,
  BreachType,
  BreachSeverity,
  NotificationStatus,
  InvestigationStatus,
  PrivacyRightType,
  VerificationStatus,
  RequestStatus,
  ReportStatus,
} from './compliance-monitoring.service';

// ===================================================================
// TYPES AND INTERFACES - SECURITY AUDIT
// ===================================================================

export type {
  SecurityScan,
  SecurityFinding,
  SecurityIncident,
  SecurityAuditReport,
  VulnerabilityAssessment,
  SecurityMetrics,
  SecurityScanType,
  ScanStatus,
  FindingType,
  SecuritySeverity,
  SecurityCategory,
  ExploitabilityLevel,
  BusinessImpact,
  FindingStatus,
  IncidentType,
  IncidentStatus,
  AttackVector,
  AuditReportType,
  RiskRating,
  ApprovalStatus,
  SecurityScanConfiguration,
  SecurityScanSummary,
  SecurityEvidence,
  RemediationGuidance,
  RemediationPlan,
  ThreatActor,
  ThreatAnalysis,
} from './security-audit.service';

// ===================================================================
// UTILITY FUNCTIONS AND CONSTANTS
// ===================================================================

/**
 * Security utilities and helper functions
 */
export const SecurityUtils = {
  /**
   * Calculate risk score based on multiple factors
   */
  calculateRiskScore(
    severity: string,
    exploitability: string,
    businessImpact: string,
    assetValue: number = 50
  ): number {
    const severityWeight = this.getSeverityWeight(severity);
    const exploitabilityWeight = this.getExploitabilityWeight(exploitability);
    const impactWeight = this.getImpactWeight(businessImpact);
    const assetWeight = Math.min(100, Math.max(0, assetValue)) / 100;

    return Math.round((severityWeight + exploitabilityWeight + impactWeight) * assetWeight);
  },

  /**
   * Get severity weight for risk calculation
   */
  getSeverityWeight(severity: string): number {
    switch (severity.toLowerCase()) {
      case 'critical': return 40;
      case 'high': return 30;
      case 'medium': return 20;
      case 'low': return 10;
      case 'informational': return 5;
      default: return 15;
    }
  },

  /**
   * Get exploitability weight for risk calculation
   */
  getExploitabilityWeight(exploitability: string): number {
    switch (exploitability.toLowerCase()) {
      case 'functional_exploit': return 30;
      case 'easy': return 25;
      case 'moderate': return 20;
      case 'difficult': return 15;
      case 'not_exploitable': return 5;
      default: return 15;
    }
  },

  /**
   * Get business impact weight for risk calculation
   */
  getImpactWeight(impact: string): number {
    switch (impact.toLowerCase()) {
      case 'critical': return 30;
      case 'high': return 25;
      case 'medium': return 15;
      case 'low': return 10;
      case 'none': return 0;
      default: return 10;
    }
  },

  /**
   * Determine if a finding requires immediate attention
   */
  requiresImmediateAttention(
    severity: string,
    exploitability: string,
    businessImpact: string
  ): boolean {
    return (
      severity === 'critical' ||
      (severity === 'high' && (exploitability === 'easy' || exploitability === 'functional_exploit')) ||
      businessImpact === 'critical'
    );
  },

  /**
   * Calculate CVSS score from finding details
   */
  calculateCVSSScore(finding: {
    attackVector: string;
    attackComplexity: string;
    privilegesRequired: string;
    userInteraction: string;
    scope: string;
    confidentialityImpact: string;
    integrityImpact: string;
    availabilityImpact: string;
  }): number {
    // Simplified CVSS v3.1 calculation
    const baseScore = this.calculateCVSSBaseScore(finding);
    return Math.round(baseScore * 10) / 10; // Round to 1 decimal place
  },

  /**
   * Calculate CVSS base score
   */
  calculateCVSSBaseScore(finding: any): number {
    // This is a simplified implementation
    // In production, use a proper CVSS library
    let score = 0;

    // Attack Vector (AV)
    switch (finding.attackVector?.toLowerCase()) {
      case 'network': score += 0.85; break;
      case 'adjacent': score += 0.62; break;
      case 'local': score += 0.55; break;
      case 'physical': score += 0.2; break;
      default: score += 0.5;
    }

    // Impact factors
    const impacts = [
      finding.confidentialityImpact,
      finding.integrityImpact,
      finding.availabilityImpact
    ];
    
    const impactScore = impacts.reduce((total, impact) => {
      switch (impact?.toLowerCase()) {
        case 'high': return total + 0.56;
        case 'low': return total + 0.22;
        case 'none': return total + 0;
        default: return total + 0.3;
      }
    }, 0);

    // Simplified calculation
    const baseScore = Math.min(10, (score * 4) + (impactScore * 2));
    return Math.max(0, baseScore);
  },

  /**
   * Get compliance framework requirements for a finding
   */
  getComplianceRequirements(
    category: string,
    dataTypes: string[]
  ): { frameworks: string[]; requirements: string[]; deadlines: Record<string, string> } {
    const frameworks: string[] = [];
    const requirements: string[] = [];
    const deadlines: Record<string, string> = {};

    // Authentication/Authorization findings
    if (category === 'authentication' || category === 'authorization') {
      frameworks.push('NIST', 'SOC2', 'GDPR');
      requirements.push('Multi-factor authentication required', 'Access controls must be documented');
      deadlines['GDPR'] = '30 days';
      deadlines['SOC2'] = '90 days';
    }

    // Data protection findings
    if (category === 'data_protection') {
      frameworks.push('GDPR', 'FERPA', 'CCPA');
      requirements.push('Data encryption required', 'Access logging mandatory');
      deadlines['GDPR'] = '72 hours';
      deadlines['FERPA'] = '30 days';
    }

    // Educational data specific
    if (dataTypes.includes('educational_records')) {
      frameworks.push('FERPA');
      requirements.push('Parental consent required for minors', 'Directory information restrictions');
      deadlines['FERPA'] = '45 days';
    }

    return { frameworks, requirements, deadlines };
  },

  /**
   * Generate remediation timeline based on severity and complexity
   */
  generateRemediationTimeline(
    severity: string,
    effort: string,
    businessPriority: string = 'medium'
  ): { timeline: string; phases: Array<{ phase: string; duration: string; description: string }> } {
    const phases: Array<{ phase: string; duration: string; description: string }> = [];
    let totalTimeline = '';

    // Planning phase
    phases.push({
      phase: 'Planning',
      duration: this.getPlanningDuration(effort),
      description: 'Analysis, design, and resource allocation'
    });

    // Implementation phase
    phases.push({
      phase: 'Implementation',
      duration: this.getImplementationDuration(severity, effort),
      description: 'Execute remediation steps and controls'
    });

    // Testing phase
    phases.push({
      phase: 'Testing',
      duration: this.getTestingDuration(effort),
      description: 'Validate remediation effectiveness'
    });

    // Deployment phase
    phases.push({
      phase: 'Deployment',
      duration: this.getDeploymentDuration(effort),
      description: 'Roll out to production environment'
    });

    // Calculate total timeline
    const totalDays = phases.reduce((total, phase) => {
      const days = this.parseDuration(phase.duration);
      return total + days;
    }, 0);

    totalTimeline = `${totalDays} days`;

    // Adjust for severity and business priority
    if (severity === 'critical') {
      totalTimeline = `${Math.ceil(totalDays * 0.5)} days (expedited)`;
    } else if (businessPriority === 'high') {
      totalTimeline = `${Math.ceil(totalDays * 0.7)} days (high priority)`;
    }

    return { timeline: totalTimeline, phases };
  },

  /**
   * Validate security configuration
   */
  validateSecurityConfiguration(config: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check required security settings
    if (!config.encryption?.enabled) {
      errors.push('Encryption must be enabled for sensitive data');
    }

    if (!config.authentication?.mfaRequired) {
      warnings.push('Multi-factor authentication is not required');
      recommendations.push('Enable MFA for enhanced security');
    }

    if (!config.logging?.auditEnabled) {
      errors.push('Audit logging must be enabled for compliance');
    }

    if (!config.networking?.httpsOnly) {
      errors.push('HTTPS-only communication must be enforced');
    }

    if (config.authentication?.passwordPolicy?.minLength < 12) {
      warnings.push('Password minimum length is below recommended 12 characters');
      recommendations.push('Increase minimum password length to 12+ characters');
    }

    if (!config.monitoring?.alertsEnabled) {
      warnings.push('Security alerts are not enabled');
      recommendations.push('Enable security monitoring and alerting');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  },

  /**
   * Generate security hash for integrity verification
   */
  generateSecurityHash(data: any, algorithm: string = 'sha256'): string {
    const crypto = require('crypto');
    const normalizedData = this.normalizeData(data);
    const dataString = JSON.stringify(normalizedData);
    return crypto.createHash(algorithm).update(dataString).digest('hex');
  },

  /**
   * Normalize data for consistent hashing
   */
  normalizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data
        .map(item => this.normalizeData(item))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    if (typeof data === 'object') {
      const normalized: any = {};
      const sortedKeys = Object.keys(data).sort();
      
      for (const key of sortedKeys) {
        normalized[key] = this.normalizeData(data[key]);
      }
      
      return normalized;
    }

    return data;
  },

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(
    data: any,
    sensitiveFields: string[] = ['password', 'token', 'key', 'secret', 'credential']
  ): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive && typeof value === 'string') {
        (masked as any)[key] = this.maskString(value);
      } else if (typeof value === 'object' && value !== null) {
        (masked as any)[key] = this.maskSensitiveData(value, sensitiveFields);
      } else {
        (masked as any)[key] = value;
      }
    }

    return masked;
  },

  /**
   * Mask string value
   */
  maskString(value: string): string {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(Math.max(0, value.length - 4));
    
    return `${start}${middle}${end}`;
  },

  // Private helper methods for timeline calculation
  private getPlanningDuration(effort: string): string {
    switch (effort) {
      case 'low': return '1-2 days';
      case 'medium': return '3-5 days';
      case 'high': return '1-2 weeks';
      case 'extensive': return '2-4 weeks';
      default: return '1 week';
    }
  },

  private getImplementationDuration(severity: string, effort: string): string {
    let baseDays = 0;
    
    switch (effort) {
      case 'low': baseDays = 2; break;
      case 'medium': baseDays = 7; break;
      case 'high': baseDays = 21; break;
      case 'extensive': baseDays = 60; break;
      default: baseDays = 7;
    }

    // Adjust for severity
    if (severity === 'critical') {
      baseDays = Math.ceil(baseDays * 0.5);
    } else if (severity === 'high') {
      baseDays = Math.ceil(baseDays * 0.7);
    }

    return `${baseDays} days`;
  },

  private getTestingDuration(effort: string): string {
    switch (effort) {
      case 'low': return '1 day';
      case 'medium': return '2-3 days';
      case 'high': return '1 week';
      case 'extensive': return '2 weeks';
      default: return '3 days';
    }
  },

  private getDeploymentDuration(effort: string): string {
    switch (effort) {
      case 'low': return '0.5 days';
      case 'medium': return '1 day';
      case 'high': return '2-3 days';
      case 'extensive': return '1 week';
      default: return '1 day';
    }
  },

  private parseDuration(duration: string): number {
    // Simple duration parser - returns days
    const match = duration.match(/(\d+(?:\.\d+)?)/);
    if (!match) return 1;
    
    const value = parseFloat(match[1]);
    
    if (duration.includes('week')) {
      return value * 7;
    } else if (duration.includes('day')) {
      return value;
    } else if (duration.includes('hour')) {
      return value / 24;
    }
    
    return value; // assume days
  },
};

/**
 * Security constants and configuration defaults
 */
export const SECURITY_CONSTANTS = {
  // Risk scoring thresholds
  RISK_THRESHOLDS: {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90,
  },

  // Compliance framework mappings
  COMPLIANCE_FRAMEWORKS: {
    NIST: 'NIST Cybersecurity Framework',
    GDPR: 'General Data Protection Regulation',
    FERPA: 'Family Educational Rights and Privacy Act',
    SOC2: 'Service Organization Control 2',
    CCPA: 'California Consumer Privacy Act',
    COPPA: 'Children\'s Online Privacy Protection Act',
  },

  // Security scan intervals (in minutes)
  SCAN_INTERVALS: {
    CRITICAL_SYSTEMS: 60,      // 1 hour
    HIGH_VALUE_ASSETS: 240,    // 4 hours
    STANDARD_SYSTEMS: 1440,    // 24 hours
    LOW_PRIORITY: 10080,       // 7 days
  },

  // Incident response timeframes (in hours)
  RESPONSE_TIMEFRAMES: {
    CRITICAL: 1,
    HIGH: 4,
    MEDIUM: 24,
    LOW: 72,
    INFORMATIONAL: 168, // 7 days
  },

  // Remediation deadlines (in days)
  REMEDIATION_DEADLINES: {
    CRITICAL: 3,
    HIGH: 14,
    MEDIUM: 30,
    LOW: 90,
    INFORMATIONAL: 180,
  },

  // Data categories for compliance
  DATA_CATEGORIES: {
    PERSONAL_IDENTIFIERS: 'Personal Identifiers',
    EDUCATIONAL_RECORDS: 'Educational Records',
    BEHAVIORAL_DATA: 'Behavioral Data',
    BIOMETRIC_DATA: 'Biometric Data',
    HEALTH_DATA: 'Health Data',
    FINANCIAL_DATA: 'Financial Data',
    COMMUNICATIONS: 'Communications',
  },

  // Legal basis for data processing (GDPR)
  LEGAL_BASIS: {
    CONSENT: 'Consent',
    CONTRACT: 'Contract',
    LEGAL_OBLIGATION: 'Legal Obligation',
    VITAL_INTERESTS: 'Vital Interests',
    PUBLIC_TASK: 'Public Task',
    LEGITIMATE_INTERESTS: 'Legitimate Interests',
  },

  // Security event severity levels
  EVENT_SEVERITY: {
    INFORMATIONAL: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  },

  // Default security settings
  DEFAULT_SETTINGS: {
    CREDENTIAL_ROTATION_DAYS: 90,
    SESSION_TIMEOUT_MINUTES: 60,
    MAX_LOGIN_ATTEMPTS: 3,
    PASSWORD_MIN_LENGTH: 12,
    MFA_REQUIRED: true,
    AUDIT_LOG_RETENTION_DAYS: 365,
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    HASH_ALGORITHM: 'SHA-256',
  },

  // Security control categories
  CONTROL_CATEGORIES: {
    PREVENTIVE: 'Preventive',
    DETECTIVE: 'Detective',
    CORRECTIVE: 'Corrective',
    COMPENSATING: 'Compensating',
  },

  // Threat intelligence sources
  THREAT_SOURCES: {
    INTERNAL: 'Internal Security Team',
    COMMERCIAL: 'Commercial Threat Intelligence',
    GOVERNMENT: 'Government Sources',
    OPEN_SOURCE: 'Open Source Intelligence',
    COMMUNITY: 'Security Community',
  },
} as const;

/**
 * Security validation schemas
 */
export const SecurityValidators = {
  /**
   * Validate password strength
   */
  isStrongPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < SECURITY_CONSTANTS.DEFAULT_SETTINGS.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONSTANTS.DEFAULT_SETTINGS.PASSWORD_MIN_LENGTH} characters`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate security configuration
   */
  isValidSecurityConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.authentication) {
      errors.push('Authentication configuration is required');
    }

    if (!config.encryption) {
      errors.push('Encryption configuration is required');
    }

    if (!config.logging) {
      errors.push('Logging configuration is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate compliance requirements
   */
  meetsComplianceRequirements(
    config: any,
    framework: string
  ): { compliant: boolean; gaps: string[]; recommendations: string[] } {
    const gaps: string[] = [];
    const recommendations: string[] = [];

    switch (framework.toUpperCase()) {
      case 'GDPR':
        if (!config.consentManagement) {
          gaps.push('Consent management system required');
        }
        if (!config.dataProtection?.encryption) {
          gaps.push('Data encryption required');
        }
        if (!config.dataSubjectRights) {
          gaps.push('Data subject rights implementation required');
        }
        break;

      case 'FERPA':
        if (!config.educationalRecords?.accessControls) {
          gaps.push('Educational records access controls required');
        }
        if (!config.parentalConsent) {
          gaps.push('Parental consent mechanism required');
        }
        break;

      case 'SOC2':
        if (!config.securityMonitoring) {
          gaps.push('Security monitoring required');
        }
        if (!config.accessManagement) {
          gaps.push('Access management controls required');
        }
        break;
    }

    return {
      compliant: gaps.length === 0,
      gaps,
      recommendations,
    };
  },
};

/**
 * Security event handlers and utilities
 */
export const SecurityEventHandlers = {
  /**
   * Handle security event
   */
  handleSecurityEvent(
    eventType: string,
    severity: string,
    details: any
  ): { handled: boolean; actions: string[]; notifications: string[] } {
    const actions: string[] = [];
    const notifications: string[] = [];

    // Determine response based on severity
    switch (severity.toLowerCase()) {
      case 'critical':
        actions.push('Immediate containment', 'Emergency response team activation');
        notifications.push('C-level executives', 'Security team', 'Legal team');
        break;

      case 'high':
        actions.push('Rapid response', 'Security team investigation');
        notifications.push('Security manager', 'IT manager');
        break;

      case 'medium':
        actions.push('Standard investigation', 'Log analysis');
        notifications.push('Security team');
        break;

      case 'low':
        actions.push('Monitoring enhancement', 'Routine analysis');
        notifications.push('Security analyst');
        break;
    }

    // Event-specific handling
    if (eventType === 'data_breach') {
      actions.push('Regulatory notification assessment', 'Affected user identification');
      notifications.push('Legal compliance team', 'Communication team');
    } else if (eventType === 'unauthorized_access') {
      actions.push('Account verification', 'Access log review');
    }

    return {
      handled: true,
      actions,
      notifications,
    };
  },

  /**
   * Calculate incident priority
   */
  calculateIncidentPriority(
    severity: string,
    businessImpact: string,
    dataTypes: string[]
  ): { priority: number; escalation: boolean; sla: number } {
    let priority = 3; // Default medium priority

    // Severity factor
    switch (severity.toLowerCase()) {
      case 'critical': priority = 1; break;
      case 'high': priority = 2; break;
      case 'medium': priority = 3; break;
      case 'low': priority = 4; break;
    }

    // Business impact factor
    if (businessImpact === 'critical') {
      priority = Math.min(priority, 1);
    } else if (businessImpact === 'high') {
      priority = Math.min(priority, 2);
    }

    // Data type factor
    if (dataTypes.includes('educational_records') || dataTypes.includes('personal_identifiers')) {
      priority = Math.min(priority, 2);
    }

    const escalation = priority <= 2;
    const sla = SECURITY_CONSTANTS.RESPONSE_TIMEFRAMES[
      Object.keys(SECURITY_CONSTANTS.RESPONSE_TIMEFRAMES)[priority - 1] as keyof typeof SECURITY_CONSTANTS.RESPONSE_TIMEFRAMES
    ] || 24;

    return { priority, escalation, sla };
  },
};

/**
 * Security metrics and reporting utilities
 */
export const SecurityReporting = {
  /**
   * Generate security scorecard
   */
  generateSecurityScorecard(metrics: any): {
    overallScore: number;
    categoryScores: Record<string, number>;
    trends: Record<string, string>;
    recommendations: string[];
  } {
    const categoryScores = {
      vulnerability_management: metrics.vulnerabilityScore || 85,
      incident_response: metrics.incidentScore || 90,
      compliance: metrics.complianceScore || 88,
      access_control: metrics.accessScore || 92,
      data_protection: metrics.dataProtectionScore || 86,
    };

    const overallScore = Math.round(
      Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 
      Object.keys(categoryScores).length
    );

    const trends = {
      vulnerability_management: 'improving',
      incident_response: 'stable',
      compliance: 'improving',
      access_control: 'stable',
      data_protection: 'improving',
    };

    const recommendations = [];
    
    // Generate recommendations based on scores
    Object.entries(categoryScores).forEach(([category, score]) => {
      if (score < 80) {
        recommendations.push(`Improve ${category.replace('_', ' ')}: Score ${score}/100`);
      }
    });

    return {
      overallScore,
      categoryScores,
      trends,
      recommendations,
    };
  },

  /**
   * Format security report
   */
  formatSecurityReport(
    reportData: any,
    format: 'summary' | 'detailed' | 'executive'
  ): { title: string; sections: Array<{ name: string; content: string }> } {
    const sections = [];

    if (format === 'executive') {
      sections.push({
        name: 'Executive Summary',
        content: `Overall security posture: ${reportData.overallScore}/100. ${reportData.keyFindings?.join('. ')}`
      });
    }

    if (format === 'detailed' || format === 'summary') {
      sections.push({
        name: 'Key Metrics',
        content: `Vulnerabilities: ${reportData.vulnerabilities || 0}, Incidents: ${reportData.incidents || 0}, Compliance: ${reportData.complianceScore || 0}%`
      });
    }

    if (format === 'detailed') {
      sections.push({
        name: 'Detailed Findings',
        content: reportData.findings?.map((f: any) => `${f.title}: ${f.description}`).join('\n') || 'No detailed findings'
      });

      sections.push({
        name: 'Recommendations',
        content: reportData.recommendations?.join('\n') || 'No recommendations'
      });
    }

    return {
      title: `Security Report - ${format.toUpperCase()}`,
      sections,
    };
  },
};
