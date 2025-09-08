/**
 * Parent/Guardian Consent Management System
 * Handles consent collection, management, and parental rights under FERPA
 */

import { StudentDataType, ConsentType, DisclosureCategory } from './ferpa-manager';

export interface ParentGuardian {
  id: string;
  studentIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  relationship: 'parent' | 'legal_guardian' | 'custodial_parent' | 'non_custodial_parent';
  primaryContact: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDate?: Date;
  verificationMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRequest {
  id: string;
  studentId: string;
  parentId: string;
  requestorId: string;
  requestorRole: string;
  dataTypes: StudentDataType[];
  purpose: string;
  disclosureCategory: DisclosureCategory;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  requestDate: Date;
  expirationDate?: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'withdrawn';
  responseDate?: Date;
  responseMethod?: 'email' | 'phone' | 'in_person' | 'electronic_signature';
  notes?: string;
  documentPaths: string[];
  remindersSent: number;
  lastReminderDate?: Date;
}

export interface DirectoryOptOut {
  id: string;
  studentId: string;
  parentId?: string;
  optOutDate: Date;
  optOutTypes: StudentDataType[];
  reason?: string;
  effectiveDate: Date;
  expirationDate?: Date;
  status: 'active' | 'expired' | 'revoked';
  documentPath?: string;
}

export interface DataAccessRequest {
  id: string;
  studentId: string;
  requestorId: string;
  requestorType: 'parent' | 'student' | 'authorized_representative';
  requestDate: Date;
  dataTypes: StudentDataType[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  purpose: string;
  deliveryMethod: 'email' | 'mail' | 'in_person' | 'secure_portal';
  status: 'pending' | 'processing' | 'completed' | 'denied';
  completionDate?: Date;
  denialReason?: string;
  documentPaths: string[];
  processingNotes?: string;
}

export interface NotificationPreferences {
  studentId: string;
  parentId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  phoneNotifications: boolean;
  mailNotifications: boolean;
  emergencyContactMethod: 'email' | 'phone' | 'sms' | 'mail';
  consentRequestNotifications: boolean;
  dataAccessNotifications: boolean;
  policyUpdateNotifications: boolean;
  directoryInformationNotifications: boolean;
  updatedAt: Date;
}

export class ConsentManagementSystem {
  private consentRequests: ConsentRequest[] = [];
  private parentGuardians: ParentGuardian[] = [];
  private directoryOptOuts: DirectoryOptOut[] = [];
  private dataAccessRequests: DataAccessRequest[] = [];
  private notificationPreferences: NotificationPreferences[] = [];

  constructor() {
    this.initializeSystem();
  }

  private initializeSystem(): void {
    console.log('👨‍👩‍👧‍👦 Initializing Consent Management System');
    this.loadParentGuardians();
    this.scheduleReminderSystem();
    this.scheduleExpirationChecks();
  }

  /**
   * Register a parent/guardian
   */
  async registerParentGuardian(parentData: Omit<ParentGuardian, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
    success: boolean;
    parentId?: string;
    verificationRequired: boolean;
    error?: string;
  }> {
    try {
      // Validate parent information
      const validation = this.validateParentInformation(parentData);
      if (!validation.valid) {
        return { success: false, error: validation.error, verificationRequired: false };
      }

      // Check for existing parent with same email
      const existingParent = this.parentGuardians.find(p => p.email === parentData.email);
      if (existingParent) {
        return { success: false, error: 'Parent already registered with this email', verificationRequired: false };
      }

      // Create parent record
      const parentId = this.generateId('parent');
      const parent: ParentGuardian = {
        ...parentData,
        id: parentId,
        verificationStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.parentGuardians.push(parent);

      // Start verification process
      await this.initiateParentVerification(parent);

      return {
        success: true,
        parentId,
        verificationRequired: true
      };

    } catch (error) {
      console.error('Parent registration failed:', error);
      return { success: false, error: 'Registration failed due to system error', verificationRequired: false };
    }
  }

  /**
   * Create a consent request
   */
  async createConsentRequest(
    studentId: string,
    requestorId: string,
    requestorRole: string,
    dataTypes: StudentDataType[],
    purpose: string,
    disclosureCategory: DisclosureCategory,
    urgency: 'low' | 'medium' | 'high' | 'emergency' = 'medium',
    expirationDays?: number
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Find parent/guardian for student
      const parent = this.findPrimaryParent(studentId);
      if (!parent) {
        return { success: false, error: 'No verified parent/guardian found for student' };
      }

      // Create consent request
      const requestId = this.generateId('consent');
      const request: ConsentRequest = {
        id: requestId,
        studentId,
        parentId: parent.id,
        requestorId,
        requestorRole,
        dataTypes,
        purpose,
        disclosureCategory,
        urgency,
        requestDate: new Date(),
        expirationDate: expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000) : undefined,
        status: 'pending',
        documentPaths: [],
        remindersSent: 0
      };

      this.consentRequests.push(request);

      // Send notification to parent
      await this.sendConsentRequestNotification(request, parent);

      // Schedule follow-up reminders
      this.scheduleConsentReminders(requestId);

      return { success: true, requestId };

    } catch (error) {
      console.error('Consent request creation failed:', error);
      return { success: false, error: 'Failed to create consent request' };
    }
  }

  /**
   * Process consent response
   */
  async processConsentResponse(
    requestId: string,
    parentId: string,
    approved: boolean,
    responseMethod: 'email' | 'phone' | 'in_person' | 'electronic_signature',
    notes?: string,
    documentPath?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = this.consentRequests.find(r => r.id === requestId);
      if (!request) {
        return { success: false, error: 'Consent request not found' };
      }

      // Verify parent is authorized to respond
      if (request.parentId !== parentId) {
        return { success: false, error: 'Parent not authorized for this consent request' };
      }

      // Update request status
      request.status = approved ? 'approved' : 'denied';
      request.responseDate = new Date();
      request.responseMethod = responseMethod;
      request.notes = notes;
      
      if (documentPath) {
        request.documentPaths.push(documentPath);
      }

      // Log consent decision
      await this.logConsentDecision(request, approved, parentId);

      // Send confirmation notification
      await this.sendConsentConfirmation(request, approved);

      // If approved, create consent record in FERPA manager
      if (approved) {
        await this.createConsentRecord(request);
      }

      return { success: true };

    } catch (error) {
      console.error('Consent response processing failed:', error);
      return { success: false, error: 'Failed to process consent response' };
    }
  }

  /**
   * Handle directory information opt-out
   */
  async processDirectoryOptOut(
    studentId: string,
    parentId: string,
    optOutTypes: StudentDataType[],
    reason?: string,
    effectiveDate?: Date
  ): Promise<{ success: boolean; optOutId?: string; error?: string }> {
    try {
      // Verify parent is authorized
      const parent = this.parentGuardians.find(p => p.id === parentId && p.studentIds.includes(studentId));
      if (!parent) {
        return { success: false, error: 'Parent not authorized for this student' };
      }

      // Create opt-out record
      const optOutId = this.generateId('optout');
      const optOut: DirectoryOptOut = {
        id: optOutId,
        studentId,
        parentId,
        optOutDate: new Date(),
        optOutTypes,
        reason,
        effectiveDate: effectiveDate || new Date(),
        status: 'active'
      };

      this.directoryOptOuts.push(optOut);

      // Notify relevant staff
      await this.notifyStaffOfOptOut(optOut);

      // Update student record
      await this.updateStudentDirectoryStatus(studentId, optOutTypes, false);

      return { success: true, optOutId };

    } catch (error) {
      console.error('Directory opt-out processing failed:', error);
      return { success: false, error: 'Failed to process directory opt-out' };
    }
  }

  /**
   * Handle data access requests from parents/students
   */
  async createDataAccessRequest(
    studentId: string,
    requestorId: string,
    requestorType: 'parent' | 'student' | 'authorized_representative',
    dataTypes: StudentDataType[],
    dateRange?: { startDate: Date; endDate: Date },
    purpose?: string,
    deliveryMethod: 'email' | 'mail' | 'in_person' | 'secure_portal' = 'email'
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Verify requestor is authorized
      const authorized = await this.verifyDataAccessAuthorization(studentId, requestorId, requestorType);
      if (!authorized) {
        return { success: false, error: 'Requestor not authorized to access student data' };
      }

      // Create data access request
      const requestId = this.generateId('access');
      const request: DataAccessRequest = {
        id: requestId,
        studentId,
        requestorId,
        requestorType,
        requestDate: new Date(),
        dataTypes,
        dateRange,
        purpose: purpose || 'Parent/student record review',
        deliveryMethod,
        status: 'pending',
        documentPaths: [],
        processingNotes: ''
      };

      this.dataAccessRequests.push(request);

      // Notify processing team
      await this.notifyDataAccessTeam(request);

      // Start processing
      this.scheduleDataAccessProcessing(requestId);

      return { success: true, requestId };

    } catch (error) {
      console.error('Data access request creation failed:', error);
      return { success: false, error: 'Failed to create data access request' };
    }
  }

  /**
   * Generate parental rights notification
   */
  async generateParentalRightsNotification(studentId: string): Promise<{
    success: boolean;
    notificationContent?: string;
    error?: string;
  }> {
    try {
      const parent = this.findPrimaryParent(studentId);
      if (!parent) {
        return { success: false, error: 'No parent/guardian found for student' };
      }

      const notificationContent = `
NOTICE OF RIGHTS UNDER THE FAMILY EDUCATIONAL RIGHTS AND PRIVACY ACT (FERPA)

Dear ${parent.firstName} ${parent.lastName},

As the parent/guardian of a student enrolled in Both Sides educational platform, you have certain rights under the Family Educational Rights and Privacy Act (FERPA) regarding your child's educational records.

YOUR RIGHTS UNDER FERPA:

1. RIGHT TO INSPECT AND REVIEW RECORDS
   You have the right to inspect and review your child's educational records maintained by the school.

2. RIGHT TO REQUEST AMENDMENT
   You have the right to request that records you believe are inaccurate or misleading be amended.

3. RIGHT TO CONSENT TO DISCLOSURES
   You have the right to consent to disclosures of personally identifiable information contained in your child's educational records.

4. RIGHT TO FILE A COMPLAINT
   You have the right to file a complaint with the U.S. Department of Education concerning alleged failures to comply with FERPA requirements.

DIRECTORY INFORMATION:
The following information may be disclosed without your consent unless you opt out:
- Student name
- Email address
- Enrollment status
- Participation in activities

To opt out of directory information disclosure or to exercise any of your rights, please contact us at privacy@bothsides.app or through your parent portal.

For more information about FERPA, visit: https://www2.ed.gov/policy/gen/guid/fpco/ferpa/index.html

Sincerely,
Both Sides Privacy Office
privacy@bothsides.app
`;

      // Send notification
      await this.sendParentalRightsNotification(parent, notificationContent);

      return { success: true, notificationContent };

    } catch (error) {
      console.error('Parental rights notification failed:', error);
      return { success: false, error: 'Failed to generate parental rights notification' };
    }
  }

  // Helper methods
  private validateParentInformation(parentData: any): { valid: boolean; error?: string } {
    if (!parentData.firstName || !parentData.lastName) {
      return { valid: false, error: 'First and last name are required' };
    }

    if (!parentData.email || !this.isValidEmail(parentData.email)) {
      return { valid: false, error: 'Valid email address is required' };
    }

    if (!parentData.studentIds || parentData.studentIds.length === 0) {
      return { valid: false, error: 'At least one student ID is required' };
    }

    if (!parentData.relationship) {
      return { valid: false, error: 'Relationship to student is required' };
    }

    return { valid: true };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private findPrimaryParent(studentId: string): ParentGuardian | null {
    return this.parentGuardians.find(p => 
      p.studentIds.includes(studentId) && 
      p.primaryContact && 
      p.verificationStatus === 'verified'
    ) || null;
  }

  private async initiateParentVerification(parent: ParentGuardian): Promise<void> {
    // Send verification email/SMS
    console.log(`📧 Sending verification to parent ${parent.id}`);
    
    // In production, would send actual verification email
    // For now, auto-verify for demo purposes
    setTimeout(() => {
      parent.verificationStatus = 'verified';
      parent.verificationDate = new Date();
      parent.verificationMethod = 'email';
    }, 1000);
  }

  private async sendConsentRequestNotification(request: ConsentRequest, parent: ParentGuardian): Promise<void> {
    console.log(`📧 Sending consent request notification to parent ${parent.id} for request ${request.id}`);
    
    // Would send actual email/SMS notification
    const notificationContent = `
Dear ${parent.firstName} ${parent.lastName},

A consent request has been submitted for your child's educational records.

Request Details:
- Purpose: ${request.purpose}
- Data Types: ${request.dataTypes.join(', ')}
- Urgency: ${request.urgency}
- Expires: ${request.expirationDate?.toLocaleDateString() || 'No expiration'}

Please log into your parent portal to review and respond to this request.

Both Sides Privacy Office
`;

    // Log notification sent
    console.log('Notification sent:', notificationContent.substring(0, 100) + '...');
  }

  private scheduleConsentReminders(requestId: string): void {
    // Schedule reminder notifications
    console.log(`⏰ Scheduling reminders for consent request ${requestId}`);
  }

  private async logConsentDecision(request: ConsentRequest, approved: boolean, parentId: string): Promise<void> {
    console.log(`📝 Consent decision logged: ${request.id} - ${approved ? 'APPROVED' : 'DENIED'} by ${parentId}`);
  }

  private async sendConsentConfirmation(request: ConsentRequest, approved: boolean): Promise<void> {
    console.log(`📧 Sending consent confirmation: ${request.id} - ${approved ? 'APPROVED' : 'DENIED'}`);
  }

  private async createConsentRecord(request: ConsentRequest): Promise<void> {
    // Create record in FERPA manager
    console.log(`📋 Creating consent record for approved request ${request.id}`);
  }

  private async notifyStaffOfOptOut(optOut: DirectoryOptOut): Promise<void> {
    console.log(`📢 Notifying staff of directory opt-out: ${optOut.id}`);
  }

  private async updateStudentDirectoryStatus(studentId: string, dataTypes: StudentDataType[], allowed: boolean): Promise<void> {
    console.log(`📝 Updating student directory status: ${studentId} - ${dataTypes.join(', ')} - ${allowed}`);
  }

  private async verifyDataAccessAuthorization(studentId: string, requestorId: string, requestorType: string): Promise<boolean> {
    // Verify requestor is authorized to access student data
    if (requestorType === 'student' && requestorId === studentId) {
      return true;
    }

    if (requestorType === 'parent') {
      const parent = this.parentGuardians.find(p => 
        p.id === requestorId && 
        p.studentIds.includes(studentId) && 
        p.verificationStatus === 'verified'
      );
      return !!parent;
    }

    return false;
  }

  private async notifyDataAccessTeam(request: DataAccessRequest): Promise<void> {
    console.log(`📧 Notifying data access team of request ${request.id}`);
  }

  private scheduleDataAccessProcessing(requestId: string): void {
    console.log(`⏰ Scheduling data access processing for request ${requestId}`);
  }

  private async sendParentalRightsNotification(parent: ParentGuardian, content: string): Promise<void> {
    console.log(`📧 Sending parental rights notification to ${parent.email}`);
  }

  private loadParentGuardians(): void {
    console.log('📋 Loading parent/guardian records...');
  }

  private scheduleReminderSystem(): void {
    console.log('⏰ Scheduling consent reminder system...');
  }

  private scheduleExpirationChecks(): void {
    console.log('⏰ Scheduling consent expiration checks...');
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const consentManager = new ConsentManagementSystem();

export default {
  ConsentManagementSystem,
  consentManager
};
