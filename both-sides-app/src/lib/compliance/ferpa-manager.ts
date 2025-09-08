/**
 * FERPA Compliance Manager
 * Comprehensive FERPA compliance implementation for educational data protection
 */

import { dataProtectionManager, FERPACategory, DataClassification } from '../security/data-protection';

// Student data types under FERPA
export enum StudentDataType {
  // Directory Information (can be disclosed without consent)
  NAME = 'name',
  ADDRESS = 'address', 
  PHONE = 'phone',
  EMAIL = 'email',
  DATE_OF_BIRTH = 'date_of_birth',
  ENROLLMENT_STATUS = 'enrollment_status',
  
  // Educational Records (require consent or legitimate interest)
  GRADES = 'grades',
  TRANSCRIPTS = 'transcripts',
  DISCIPLINARY_RECORDS = 'disciplinary_records',
  ATTENDANCE_RECORDS = 'attendance_records',
  DEBATE_PERFORMANCE = 'debate_performance',
  SURVEY_RESPONSES = 'survey_responses',
  BEHAVIORAL_ASSESSMENTS = 'behavioral_assessments',
  
  // Special Categories
  DISABILITY_RECORDS = 'disability_records',
  HEALTH_RECORDS = 'health_records',
  PSYCHOLOGICAL_RECORDS = 'psychological_records'
}

// FERPA disclosure categories
export enum DisclosureCategory {
  SCHOOL_OFFICIALS = 'school_officials',
  OTHER_SCHOOLS = 'other_schools', 
  SPECIFIED_OFFICIALS = 'specified_officials',
  COMPLIANCE_WITH_SUBPOENA = 'compliance_with_subpoena',
  HEALTH_SAFETY_EMERGENCY = 'health_safety_emergency',
  DIRECTORY_INFORMATION = 'directory_information',
  PARENT_OR_STUDENT = 'parent_or_student',
  FINANCIAL_AID = 'financial_aid',
  ORGANIZATIONS_CONDUCTING_STUDIES = 'organizations_conducting_studies',
  ACCREDITING_ORGANIZATIONS = 'accrediting_organizations'
}

// Consent types
export enum ConsentType {
  EXPLICIT_WRITTEN = 'explicit_written',
  ELECTRONIC_SIGNATURE = 'electronic_signature',
  IMPLIED_DIRECTORY = 'implied_directory',
  LEGITIMATE_INTEREST = 'legitimate_interest',
  EMERGENCY_DISCLOSURE = 'emergency_disclosure'
}

// User roles for access control
export enum UserRole {
  STUDENT = 'student',
  PARENT = 'parent',
  TEACHER = 'teacher',
  ADMINISTRATOR = 'administrator',
  COUNSELOR = 'counselor',
  EXTERNAL_RESEARCHER = 'external_researcher',
  SYSTEM_ADMINISTRATOR = 'system_administrator'
}

export interface StudentRecord {
  studentId: string;
  dataType: StudentDataType;
  category: FERPACategory;
  classification: DataClassification;
  data: any;
  createdAt: Date;
  updatedAt: Date;
  retentionPeriod: number; // days
  accessLog: AccessLogEntry[];
  consentRequired: boolean;
  directoryInformation: boolean;
}

export interface AccessLogEntry {
  id: string;
  accessorId: string;
  accessorRole: UserRole;
  studentId: string;
  dataType: StudentDataType;
  purpose: string;
  disclosureCategory: DisclosureCategory;
  consentType?: ConsentType;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  approved: boolean;
  approvedBy?: string;
  notes?: string;
}

export interface ConsentRecord {
  id: string;
  studentId: string;
  parentId?: string;
  dataTypes: StudentDataType[];
  purpose: string;
  disclosureCategory: DisclosureCategory;
  consentType: ConsentType;
  consentDate: Date;
  expirationDate?: Date;
  revoked: boolean;
  revokedDate?: Date;
  documentPath?: string;
  ipAddress: string;
  userAgent: string;
}

export interface DataSharingAgreement {
  id: string;
  organizationName: string;
  contactInfo: string;
  purpose: string;
  dataTypes: StudentDataType[];
  startDate: Date;
  endDate: Date;
  active: boolean;
  complianceRequirements: string[];
  auditSchedule: string;
  documentPath: string;
}

export class FERPAComplianceManager {
  private accessLog: AccessLogEntry[] = [];
  private consentRecords: ConsentRecord[] = [];
  private dataSharingAgreements: DataSharingAgreement[] = [];

  constructor() {
    this.initializeCompliance();
  }

  private initializeCompliance(): void {
    console.log('🎓 Initializing FERPA Compliance Manager');
    this.loadConsentRecords();
    this.loadDataSharingAgreements();
    this.scheduleComplianceChecks();
  }

  /**
   * Check if access to student data is FERPA compliant
   */
  async checkDataAccess(
    accessorId: string,
    accessorRole: UserRole,
    studentId: string,
    dataType: StudentDataType,
    purpose: string,
    ipAddress?: string
  ): Promise<{
    allowed: boolean;
    reason: string;
    consentRequired: boolean;
    disclosureCategory?: DisclosureCategory;
    requiresDocumentation?: boolean;
  }> {
    try {
      // Log the access attempt
      const accessEntry: AccessLogEntry = {
        id: this.generateId(),
        accessorId,
        accessorRole,
        studentId,
        dataType,
        purpose,
        disclosureCategory: DisclosureCategory.SCHOOL_OFFICIALS, // Default
        timestamp: new Date(),
        ipAddress,
        approved: false
      };

      // Check if data type is directory information
      if (this.isDirectoryInformation(dataType)) {
        // Check if student has opted out of directory information disclosure
        const hasOptedOut = await this.hasOptedOutOfDirectory(studentId);
        if (hasOptedOut && accessorRole !== UserRole.STUDENT && !this.isParentAccess(accessorId, studentId)) {
          accessEntry.approved = false;
          accessEntry.notes = 'Student has opted out of directory information disclosure';
          this.accessLog.push(accessEntry);
          
          return {
            allowed: false,
            reason: 'Student has opted out of directory information disclosure',
            consentRequired: true
          };
        }

        // Directory information can be disclosed without consent
        accessEntry.approved = true;
        accessEntry.disclosureCategory = DisclosureCategory.DIRECTORY_INFORMATION;
        this.accessLog.push(accessEntry);

        return {
          allowed: true,
          reason: 'Directory information disclosure allowed',
          consentRequired: false,
          disclosureCategory: DisclosureCategory.DIRECTORY_INFORMATION
        };
      }

      // Check for self-access (student accessing their own records)
      if (accessorId === studentId && accessorRole === UserRole.STUDENT) {
        accessEntry.approved = true;
        accessEntry.disclosureCategory = DisclosureCategory.PARENT_OR_STUDENT;
        this.accessLog.push(accessEntry);

        return {
          allowed: true,
          reason: 'Student accessing own educational records',
          consentRequired: false,
          disclosureCategory: DisclosureCategory.PARENT_OR_STUDENT
        };
      }

      // Check for parent access
      if (await this.isParentAccess(accessorId, studentId)) {
        accessEntry.approved = true;
        accessEntry.disclosureCategory = DisclosureCategory.PARENT_OR_STUDENT;
        this.accessLog.push(accessEntry);

        return {
          allowed: true,
          reason: 'Parent/guardian accessing student records',
          consentRequired: false,
          disclosureCategory: DisclosureCategory.PARENT_OR_STUDENT
        };
      }

      // Check for legitimate educational interest
      if (await this.hasLegitimateEducationalInterest(accessorId, accessorRole, studentId, purpose)) {
        accessEntry.approved = true;
        accessEntry.disclosureCategory = DisclosureCategory.SCHOOL_OFFICIALS;
        this.accessLog.push(accessEntry);

        return {
          allowed: true,
          reason: 'Legitimate educational interest',
          consentRequired: false,
          disclosureCategory: DisclosureCategory.SCHOOL_OFFICIALS,
          requiresDocumentation: true
        };
      }

      // Check for existing consent
      const consent = await this.findValidConsent(studentId, dataType, purpose);
      if (consent) {
        accessEntry.approved = true;
        accessEntry.disclosureCategory = this.getDisclosureCategoryFromPurpose(purpose);
        accessEntry.consentType = consent.consentType;
        this.accessLog.push(accessEntry);

        return {
          allowed: true,
          reason: 'Valid consent exists',
          consentRequired: false,
          disclosureCategory: accessEntry.disclosureCategory
        };
      }

      // No valid access found - consent required
      accessEntry.approved = false;
      accessEntry.notes = 'No valid consent or legitimate interest found';
      this.accessLog.push(accessEntry);

      return {
        allowed: false,
        reason: 'Explicit consent required for educational record access',
        consentRequired: true,
        requiresDocumentation: true
      };

    } catch (error) {
      console.error('FERPA access check failed:', error);
      return {
        allowed: false,
        reason: 'Access check failed due to system error',
        consentRequired: true
      };
    }
  }

  /**
   * Request consent for data access
   */
  async requestConsent(
    studentId: string,
    requestorId: string,
    dataTypes: StudentDataType[],
    purpose: string,
    disclosureCategory: DisclosureCategory,
    expirationDays?: number
  ): Promise<{ consentId: string; requiresParentalConsent: boolean }> {
    const consentId = this.generateId();
    const isMinor = await this.isMinorStudent(studentId);
    
    const consentRecord: ConsentRecord = {
      id: consentId,
      studentId,
      parentId: isMinor ? await this.getParentId(studentId) : undefined,
      dataTypes,
      purpose,
      disclosureCategory,
      consentType: ConsentType.EXPLICIT_WRITTEN,
      consentDate: new Date(),
      expirationDate: expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) : undefined,
      revoked: false,
      ipAddress: 'system', // Would get from request context
      userAgent: 'system'
    };

    // Store consent request (would be stored in database)
    this.consentRecords.push(consentRecord);

    // Send consent request notification
    await this.sendConsentRequest(consentRecord);

    return {
      consentId,
      requiresParentalConsent: isMinor
    };
  }

  /**
   * Grant consent for data access
   */
  async grantConsent(
    consentId: string,
    grantorId: string,
    consentType: ConsentType,
    ipAddress: string,
    userAgent: string,
    documentPath?: string
  ): Promise<{ success: boolean; error?: string }> {
    const consent = this.consentRecords.find(c => c.id === consentId);
    if (!consent) {
      return { success: false, error: 'Consent record not found' };
    }

    // Verify grantor is authorized (student or parent)
    const isAuthorized = grantorId === consent.studentId || 
                        grantorId === consent.parentId ||
                        await this.isParentAccess(grantorId, consent.studentId);

    if (!isAuthorized) {
      return { success: false, error: 'Grantor not authorized to provide consent' };
    }

    // Update consent record
    consent.consentType = consentType;
    consent.consentDate = new Date();
    consent.ipAddress = ipAddress;
    consent.userAgent = userAgent;
    consent.documentPath = documentPath;

    // Log consent grant
    this.logConsentAction(consentId, 'GRANTED', grantorId);

    return { success: true };
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    consentId: string,
    revokerI: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const consent = this.consentRecords.find(c => c.id === consentId);
    if (!consent) {
      return { success: false, error: 'Consent record not found' };
    }

    // Verify revoker is authorized
    const isAuthorized = revokerI === consent.studentId || 
                        revokerI === consent.parentId ||
                        await this.isParentAccess(revokerI, consent.studentId);

    if (!isAuthorized) {
      return { success: false, error: 'User not authorized to revoke consent' };
    }

    // Revoke consent
    consent.revoked = true;
    consent.revokedDate = new Date();

    // Log consent revocation
    this.logConsentAction(consentId, 'REVOKED', revokerI, reason);

    return { success: true };
  }

  /**
   * Generate FERPA compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    summary: {
      totalAccesses: number;
      approvedAccesses: number;
      deniedAccesses: number;
      consentRequests: number;
      activeConsents: number;
      revokedConsents: number;
      directoryOptOuts: number;
    };
    accessByRole: Record<UserRole, number>;
    accessByDataType: Record<StudentDataType, number>;
    violations: Array<{
      id: string;
      timestamp: Date;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      resolved: boolean;
    }>;
    recommendations: string[];
  }> {
    const periodAccesses = this.accessLog.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    );

    const periodConsents = this.consentRecords.filter(
      consent => consent.consentDate >= startDate && consent.consentDate <= endDate
    );

    const accessByRole: Record<UserRole, number> = {} as Record<UserRole, number>;
    const accessByDataType: Record<StudentDataType, number> = {} as Record<StudentDataType, number>;

    // Count accesses by role and data type
    for (const access of periodAccesses) {
      accessByRole[access.accessorRole] = (accessByRole[access.accessorRole] || 0) + 1;
      accessByDataType[access.dataType] = (accessByDataType[access.dataType] || 0) + 1;
    }

    // Detect potential violations
    const violations = await this.detectComplianceViolations(periodAccesses);

    // Generate recommendations
    const recommendations = this.generateComplianceRecommendations(periodAccesses, violations);

    return {
      summary: {
        totalAccesses: periodAccesses.length,
        approvedAccesses: periodAccesses.filter(a => a.approved).length,
        deniedAccesses: periodAccesses.filter(a => !a.approved).length,
        consentRequests: periodConsents.length,
        activeConsents: this.consentRecords.filter(c => !c.revoked).length,
        revokedConsents: this.consentRecords.filter(c => c.revoked).length,
        directoryOptOuts: 0 // Would query database
      },
      accessByRole,
      accessByDataType,
      violations,
      recommendations
    };
  }

  // Helper methods
  private isDirectoryInformation(dataType: StudentDataType): boolean {
    const directoryTypes = [
      StudentDataType.NAME,
      StudentDataType.ADDRESS,
      StudentDataType.PHONE,
      StudentDataType.EMAIL,
      StudentDataType.DATE_OF_BIRTH,
      StudentDataType.ENROLLMENT_STATUS
    ];
    return directoryTypes.includes(dataType);
  }

  private async hasOptedOutOfDirectory(studentId: string): Promise<boolean> {
    // Would query database for opt-out status
    return false;
  }

  private async isParentAccess(accessorId: string, studentId: string): Promise<boolean> {
    // Would query database for parent-student relationships
    return false;
  }

  private async hasLegitimateEducationalInterest(
    accessorId: string,
    accessorRole: UserRole,
    studentId: string,
    purpose: string
  ): Promise<boolean> {
    // Check if accessor has legitimate educational interest
    const legitimateRoles = [UserRole.TEACHER, UserRole.ADMINISTRATOR, UserRole.COUNSELOR];
    if (!legitimateRoles.includes(accessorRole)) {
      return false;
    }

    // Additional checks would verify:
    // - Accessor is assigned to student's class/program
    // - Purpose aligns with educational objectives
    // - Access is necessary for official duties
    
    return true; // Simplified for demo
  }

  private async findValidConsent(
    studentId: string,
    dataType: StudentDataType,
    purpose: string
  ): Promise<ConsentRecord | null> {
    const now = new Date();
    
    return this.consentRecords.find(consent =>
      consent.studentId === studentId &&
      consent.dataTypes.includes(dataType) &&
      consent.purpose === purpose &&
      !consent.revoked &&
      (!consent.expirationDate || consent.expirationDate > now)
    ) || null;
  }

  private async isMinorStudent(studentId: string): Promise<boolean> {
    // Would query database for student age/status
    return true; // Assume minor for demo
  }

  private async getParentId(studentId: string): Promise<string | undefined> {
    // Would query database for parent ID
    return 'parent_' + studentId;
  }

  private getDisclosureCategoryFromPurpose(purpose: string): DisclosureCategory {
    // Map purpose to appropriate disclosure category
    if (purpose.includes('research')) return DisclosureCategory.ORGANIZATIONS_CONDUCTING_STUDIES;
    if (purpose.includes('financial')) return DisclosureCategory.FINANCIAL_AID;
    if (purpose.includes('transfer')) return DisclosureCategory.OTHER_SCHOOLS;
    return DisclosureCategory.SCHOOL_OFFICIALS;
  }

  private async sendConsentRequest(consent: ConsentRecord): Promise<void> {
    // Would send email/notification to student/parent
    console.log(`📧 Consent request sent for student ${consent.studentId}`);
  }

  private logConsentAction(consentId: string, action: string, userId: string, reason?: string): void {
    console.log(`📝 Consent ${action}: ${consentId} by ${userId}${reason ? ` - ${reason}` : ''}`);
  }

  private async detectComplianceViolations(accesses: AccessLogEntry[]): Promise<any[]> {
    // Detect potential FERPA violations
    const violations: any[] = [];

    // Check for unusual access patterns
    const accessCounts = new Map<string, number>();
    for (const access of accesses) {
      const key = `${access.accessorId}-${access.studentId}`;
      accessCounts.set(key, (accessCounts.get(key) || 0) + 1);
    }

    // Flag high-frequency access as potential violation
    for (const [key, count] of accessCounts) {
      if (count > 50) { // Threshold
        violations.push({
          id: this.generateId(),
          timestamp: new Date(),
          description: `High frequency access detected: ${key} (${count} accesses)`,
          severity: 'medium' as const,
          resolved: false
        });
      }
    }

    return violations;
  }

  private generateComplianceRecommendations(accesses: AccessLogEntry[], violations: any[]): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push('Review and investigate flagged compliance violations');
    }

    if (accesses.filter(a => !a.approved).length > accesses.length * 0.1) {
      recommendations.push('High number of denied accesses - review access policies and training');
    }

    recommendations.push('Conduct regular FERPA training for all staff with student data access');
    recommendations.push('Review and update data sharing agreements annually');
    recommendations.push('Implement automated compliance monitoring alerts');

    return recommendations;
  }

  private loadConsentRecords(): void {
    // Would load from database
    console.log('📋 Loading consent records...');
  }

  private loadDataSharingAgreements(): void {
    // Would load from database
    console.log('📄 Loading data sharing agreements...');
  }

  private scheduleComplianceChecks(): void {
    // Schedule regular compliance checks
    console.log('⏰ Scheduling compliance checks...');
  }

  private generateId(): string {
    return 'ferpa_' + Math.random().toString(36).substring(2, 15);
  }
}

// Export singleton instance
export const ferpaManager = new FERPAComplianceManager();

export default {
  FERPAComplianceManager,
  ferpaManager,
  StudentDataType,
  DisclosureCategory,
  ConsentType,
  UserRole
};
