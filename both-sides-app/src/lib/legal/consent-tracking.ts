/**
 * Consent Tracking and Management System
 * Privacy policy acceptance, version tracking, and user consent management
 */

export interface LegalDocument {
  id: string;
  type: 'privacy_policy' | 'terms_of_service' | 'cookie_policy' | 'ferpa_notice' | 'coppa_consent';
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  expirationDate?: Date;
  requiresConsent: boolean;
  requiresParentalConsent: boolean;
  mandatoryForService: boolean;
  changes: DocumentChange[];
  metadata: {
    language: string;
    jurisdiction: string;
    category: string;
    lastReviewed: Date;
    reviewedBy: string;
    approvedBy: string;
  };
}

export interface DocumentChange {
  version: string;
  changeDate: Date;
  changeType: 'major' | 'minor' | 'clarification' | 'legal_update';
  summary: string;
  details: string;
  affectedSections: string[];
  requiresReconsent: boolean;
  notificationSent: boolean;
  notificationDate?: Date;
}

export interface UserConsent {
  id: string;
  userId: string;
  documentId: string;
  documentVersion: string;
  documentType: LegalDocument['type'];
  consentStatus: 'granted' | 'denied' | 'withdrawn' | 'expired' | 'pending';
  consentMethod: 'explicit_click' | 'electronic_signature' | 'parental_consent' | 'institutional_consent';
  consentDate: Date;
  expirationDate?: Date;
  ipAddress: string;
  userAgent: string;
  consentData: {
    granularConsents?: Record<string, boolean>;
    parentalConsentId?: string;
    institutionalConsentId?: string;
    witnessId?: string;
    consentText: string;
  };
  withdrawalDate?: Date;
  withdrawalReason?: string;
  renewalRequired: boolean;
  lastRenewalDate?: Date;
}

export interface ConsentNotification {
  id: string;
  userId: string;
  documentId: string;
  notificationType: 'new_document' | 'document_update' | 'consent_expiring' | 'consent_required' | 'withdrawal_confirmation';
  notificationDate: Date;
  deliveryMethod: 'email' | 'in_app' | 'sms' | 'mail';
  status: 'sent' | 'delivered' | 'read' | 'acted_upon' | 'failed';
  responseDate?: Date;
  responseAction?: string;
  retryCount: number;
  maxRetries: number;
}

export interface ConsentReport {
  userId: string;
  userName: string;
  userType: 'student' | 'teacher' | 'parent' | 'administrator';
  consents: Array<{
    documentType: string;
    documentVersion: string;
    status: string;
    consentDate: Date;
    expirationDate?: Date;
    requiresAction: boolean;
  }>;
  pendingActions: Array<{
    action: string;
    documentType: string;
    dueDate: Date;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }>;
  complianceStatus: 'compliant' | 'partial' | 'non_compliant' | 'pending';
}

export class ConsentTrackingSystem {
  private documents: Map<string, LegalDocument> = new Map();
  private userConsents: Map<string, UserConsent[]> = new Map();
  private notifications: Map<string, ConsentNotification[]> = new Map();

  constructor() {
    this.initializeConsentSystem();
  }

  private initializeConsentSystem(): void {
    console.log('📋 Initializing Consent Tracking System');
    
    // Load existing legal documents
    this.loadLegalDocuments();
    
    // Load user consents
    this.loadUserConsents();
    
    // Schedule consent monitoring
    this.scheduleConsentMonitoring();
    
    // Check for expired or expiring consents
    this.checkConsentStatus();
  }

  /**
   * Register a new legal document
   */
  async registerDocument(
    type: LegalDocument['type'],
    version: string,
    title: string,
    content: string,
    effectiveDate: Date,
    options: {
      requiresConsent?: boolean;
      requiresParentalConsent?: boolean;
      mandatoryForService?: boolean;
      expirationDate?: Date;
      language?: string;
      jurisdiction?: string;
      category?: string;
    } = {}
  ): Promise<LegalDocument> {
    const documentId = this.generateDocumentId(type, version);
    
    const document: LegalDocument = {
      id: documentId,
      type,
      version,
      title,
      content,
      effectiveDate,
      expirationDate: options.expirationDate,
      requiresConsent: options.requiresConsent ?? true,
      requiresParentalConsent: options.requiresParentalConsent ?? false,
      mandatoryForService: options.mandatoryForService ?? true,
      changes: [],
      metadata: {
        language: options.language || 'en-US',
        jurisdiction: options.jurisdiction || 'US',
        category: options.category || 'general',
        lastReviewed: new Date(),
        reviewedBy: 'system',
        approvedBy: 'legal_team'
      }
    };

    this.documents.set(documentId, document);
    
    // Notify existing users of new document
    if (document.requiresConsent) {
      await this.notifyUsersOfNewDocument(document);
    }

    console.log(`📄 Registered new legal document: ${type} v${version}`);
    return document;
  }

  /**
   * Update an existing legal document
   */
  async updateDocument(
    documentId: string,
    newVersion: string,
    content: string,
    changes: Omit<DocumentChange, 'version' | 'changeDate' | 'notificationSent'>
  ): Promise<LegalDocument> {
    const existingDocument = this.documents.get(documentId);
    if (!existingDocument) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Create new document version
    const updatedDocument: LegalDocument = {
      ...existingDocument,
      version: newVersion,
      content,
      effectiveDate: new Date(),
      changes: [
        ...existingDocument.changes,
        {
          ...changes,
          version: newVersion,
          changeDate: new Date(),
          notificationSent: false
        }
      ],
      metadata: {
        ...existingDocument.metadata,
        lastReviewed: new Date()
      }
    };

    const newDocumentId = this.generateDocumentId(existingDocument.type, newVersion);
    this.documents.set(newDocumentId, updatedDocument);

    // Notify users of document update
    if (changes.requiresReconsent) {
      await this.notifyUsersOfDocumentUpdate(updatedDocument, changes);
    }

    console.log(`📄 Updated legal document: ${existingDocument.type} v${newVersion}`);
    return updatedDocument;
  }

  /**
   * Record user consent for a document
   */
  async recordConsent(
    userId: string,
    documentId: string,
    consentMethod: UserConsent['consentMethod'],
    ipAddress: string,
    userAgent: string,
    options: {
      granularConsents?: Record<string, boolean>;
      parentalConsentId?: string;
      institutionalConsentId?: string;
      witnessId?: string;
      expirationDate?: Date;
    } = {}
  ): Promise<UserConsent> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const consentId = this.generateConsentId();
    const consentDate = new Date();

    const consent: UserConsent = {
      id: consentId,
      userId,
      documentId,
      documentVersion: document.version,
      documentType: document.type,
      consentStatus: 'granted',
      consentMethod,
      consentDate,
      expirationDate: options.expirationDate,
      ipAddress,
      userAgent,
      consentData: {
        granularConsents: options.granularConsents,
        parentalConsentId: options.parentalConsentId,
        institutionalConsentId: options.institutionalConsentId,
        witnessId: options.witnessId,
        consentText: this.generateConsentText(document)
      },
      renewalRequired: false
    };

    // Store consent
    const userConsents = this.userConsents.get(userId) || [];
    userConsents.push(consent);
    this.userConsents.set(userId, userConsents);

    // Log consent action
    console.log(`✅ Recorded consent: ${userId} → ${document.type} v${document.version}`);

    // Send confirmation notification
    await this.sendConsentConfirmation(consent);

    return consent;
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(
    userId: string,
    consentId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const userConsents = this.userConsents.get(userId) || [];
    const consent = userConsents.find(c => c.id === consentId);

    if (!consent) {
      return { success: false, error: 'Consent record not found' };
    }

    if (consent.consentStatus === 'withdrawn') {
      return { success: false, error: 'Consent already withdrawn' };
    }

    // Update consent status
    consent.consentStatus = 'withdrawn';
    consent.withdrawalDate = new Date();
    consent.withdrawalReason = reason;

    console.log(`❌ Withdrew consent: ${userId} → ${consent.documentType} v${consent.documentVersion}`);

    // Send withdrawal confirmation
    await this.sendWithdrawalConfirmation(consent);

    // Check if withdrawal affects service access
    await this.checkServiceAccessAfterWithdrawal(userId, consent);

    return { success: true };
  }

  /**
   * Get user's consent status for all documents
   */
  getUserConsentStatus(userId: string): ConsentReport {
    const userConsents = this.userConsents.get(userId) || [];
    const activeDocuments = Array.from(this.documents.values())
      .filter(doc => doc.requiresConsent && !doc.expirationDate || doc.expirationDate > new Date());

    const consents = activeDocuments.map(doc => {
      const userConsent = userConsents
        .filter(c => c.documentType === doc.type && c.consentStatus !== 'withdrawn')
        .sort((a, b) => b.consentDate.getTime() - a.consentDate.getTime())[0];

      return {
        documentType: doc.type,
        documentVersion: userConsent?.documentVersion || 'none',
        status: userConsent?.consentStatus || 'pending',
        consentDate: userConsent?.consentDate || new Date(0),
        expirationDate: userConsent?.expirationDate,
        requiresAction: !userConsent || userConsent.consentStatus !== 'granted'
      };
    });

    const pendingActions = consents
      .filter(c => c.requiresAction)
      .map(c => ({
        action: 'consent_required',
        documentType: c.documentType,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        urgency: this.getActionUrgency(c.documentType)
      }));

    const complianceStatus = this.determineComplianceStatus(consents);

    return {
      userId,
      userName: 'User Name', // Would be fetched from user service
      userType: 'student', // Would be determined from user data
      consents,
      pendingActions,
      complianceStatus
    };
  }

  /**
   * Check for expiring consents and send notifications
   */
  async checkExpiringConsents(): Promise<void> {
    console.log('🔍 Checking for expiring consents...');

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const [userId, consents] of this.userConsents) {
      for (const consent of consents) {
        if (consent.expirationDate && 
            consent.expirationDate <= thirtyDaysFromNow && 
            consent.consentStatus === 'granted') {
          
          await this.sendExpirationNotification(consent);
        }
      }
    }
  }

  /**
   * Generate consent compliance report
   */
  generateComplianceReport(): {
    summary: {
      totalUsers: number;
      compliantUsers: number;
      pendingConsents: number;
      expiredConsents: number;
      withdrawnConsents: number;
    };
    documentStats: Array<{
      documentType: string;
      version: string;
      totalConsents: number;
      activeConsents: number;
      consentRate: number;
    }>;
    upcomingExpirations: Array<{
      userId: string;
      documentType: string;
      expirationDate: Date;
      daysUntilExpiration: number;
    }>;
  } {
    const allConsents = Array.from(this.userConsents.values()).flat();
    const activeDocuments = Array.from(this.documents.values())
      .filter(doc => doc.requiresConsent);

    const documentStats = activeDocuments.map(doc => {
      const documentConsents = allConsents.filter(c => c.documentType === doc.type);
      const activeConsents = documentConsents.filter(c => c.consentStatus === 'granted');
      
      return {
        documentType: doc.type,
        version: doc.version,
        totalConsents: documentConsents.length,
        activeConsents: activeConsents.length,
        consentRate: documentConsents.length > 0 ? activeConsents.length / documentConsents.length : 0
      };
    });

    const now = new Date();
    const upcomingExpirations = allConsents
      .filter(c => c.expirationDate && c.expirationDate > now && c.consentStatus === 'granted')
      .map(c => ({
        userId: c.userId,
        documentType: c.documentType,
        expirationDate: c.expirationDate!,
        daysUntilExpiration: Math.ceil((c.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    return {
      summary: {
        totalUsers: this.userConsents.size,
        compliantUsers: 0, // Would calculate based on compliance status
        pendingConsents: allConsents.filter(c => c.consentStatus === 'pending').length,
        expiredConsents: allConsents.filter(c => c.consentStatus === 'expired').length,
        withdrawnConsents: allConsents.filter(c => c.consentStatus === 'withdrawn').length
      },
      documentStats,
      upcomingExpirations
    };
  }

  // Helper methods
  private async notifyUsersOfNewDocument(document: LegalDocument): Promise<void> {
    console.log(`📧 Notifying users of new document: ${document.type}`);
    // Implementation would send notifications to all users
  }

  private async notifyUsersOfDocumentUpdate(
    document: LegalDocument,
    changes: DocumentChange
  ): Promise<void> {
    console.log(`📧 Notifying users of document update: ${document.type} v${document.version}`);
    // Implementation would send update notifications
  }

  private async sendConsentConfirmation(consent: UserConsent): Promise<void> {
    console.log(`📧 Sending consent confirmation: ${consent.userId} → ${consent.documentType}`);
    // Implementation would send confirmation email/notification
  }

  private async sendWithdrawalConfirmation(consent: UserConsent): Promise<void> {
    console.log(`📧 Sending withdrawal confirmation: ${consent.userId} → ${consent.documentType}`);
    // Implementation would send withdrawal confirmation
  }

  private async sendExpirationNotification(consent: UserConsent): Promise<void> {
    console.log(`📧 Sending expiration notification: ${consent.userId} → ${consent.documentType}`);
    // Implementation would send expiration warning
  }

  private async checkServiceAccessAfterWithdrawal(
    userId: string,
    withdrawnConsent: UserConsent
  ): Promise<void> {
    const document = this.documents.get(withdrawnConsent.documentId);
    if (document?.mandatoryForService) {
      console.log(`⚠️ User ${userId} may lose service access due to consent withdrawal`);
      // Implementation would handle service access restrictions
    }
  }

  private generateConsentText(document: LegalDocument): string {
    return `I consent to the ${document.title} version ${document.version}, effective ${document.effectiveDate.toLocaleDateString()}.`;
  }

  private getActionUrgency(documentType: string): 'low' | 'medium' | 'high' | 'critical' {
    const urgencyMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'privacy_policy': 'high',
      'terms_of_service': 'high',
      'ferpa_notice': 'critical',
      'coppa_consent': 'critical',
      'cookie_policy': 'medium'
    };
    
    return urgencyMap[documentType] || 'medium';
  }

  private determineComplianceStatus(consents: any[]): ConsentReport['complianceStatus'] {
    const criticalConsents = consents.filter(c => 
      ['ferpa_notice', 'coppa_consent', 'privacy_policy'].includes(c.documentType)
    );
    
    const criticalMissing = criticalConsents.filter(c => c.requiresAction);
    
    if (criticalMissing.length > 0) return 'non_compliant';
    if (consents.some(c => c.requiresAction)) return 'partial';
    return 'compliant';
  }

  private generateDocumentId(type: string, version: string): string {
    return `doc_${type}_${version}_${Date.now()}`;
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private loadLegalDocuments(): void {
    console.log('📋 Loading legal documents...');
    // Implementation would load from database
  }

  private loadUserConsents(): void {
    console.log('📋 Loading user consents...');
    // Implementation would load from database
  }

  private scheduleConsentMonitoring(): void {
    // Check for expiring consents daily
    setInterval(() => {
      this.checkExpiringConsents();
    }, 24 * 60 * 60 * 1000);

    console.log('⏰ Scheduled consent monitoring');
  }

  private checkConsentStatus(): void {
    console.log('🔍 Checking consent status...');
    // Implementation would check all consent statuses
  }
}

// Export singleton instance
export const consentTracker = new ConsentTrackingSystem();

export default {
  ConsentTrackingSystem,
  consentTracker
};
