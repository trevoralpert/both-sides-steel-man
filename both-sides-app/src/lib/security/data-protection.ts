/**
 * Data Protection and Encryption Utilities
 * Handles sensitive data encryption, PII classification, and FERPA compliance
 */

import crypto from 'crypto';

// Data classification levels
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted', // FERPA protected educational records
}

// PII (Personally Identifiable Information) types
export enum PIIType {
  NAME = 'name',
  EMAIL = 'email',
  STUDENT_ID = 'student_id',
  GRADE = 'grade',
  EDUCATIONAL_RECORD = 'educational_record',
  BEHAVIORAL_DATA = 'behavioral_data',
  IP_ADDRESS = 'ip_address',
  DEVICE_ID = 'device_id',
}

// FERPA data categories
export enum FERPACategory {
  DIRECTORY_INFO = 'directory_info',        // Name, address, phone, email
  EDUCATIONAL_RECORD = 'educational_record', // Grades, transcripts, disciplinary records
  BEHAVIORAL_DATA = 'behavioral_data',       // Debate performance, engagement metrics
  METADATA = 'metadata',                     // Login times, IP addresses, usage patterns
}

export interface DataClassificationMetadata {
  classification: DataClassification;
  piiTypes: PIIType[];
  ferpaCategory?: FERPACategory;
  retentionPeriod: number; // in days
  encryptionRequired: boolean;
  auditRequired: boolean;
  description: string;
}

export class DataProtectionManager {
  private encryptionKey: string;
  private algorithm = 'aes-256-gcm';

  constructor() {
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY || this.generateEncryptionKey();
    
    if (!process.env.DATA_ENCRYPTION_KEY) {
      console.warn('⚠️ DATA_ENCRYPTION_KEY not set in environment variables. Using generated key.');
    }
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string, associatedData?: string): { 
    encrypted: string; 
    iv: string; 
    tag: string; 
    metadata?: string 
  } {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
      
      if (associatedData) {
        cipher.setAAD(Buffer.from(associatedData));
      }

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        metadata: associatedData
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: { 
    encrypted: string; 
    iv: string; 
    tag: string; 
    metadata?: string 
  }): string {
    try {
      const decipher = crypto.createDecipher(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      if (encryptedData.metadata) {
        decipher.setAAD(Buffer.from(encryptedData.metadata));
      }

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
    
    return { hash, salt: actualSalt };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Mask PII data for logging/display
   */
  maskPII(data: string, piiType: PIIType): string {
    switch (piiType) {
      case PIIType.EMAIL:
        const [username, domain] = data.split('@');
        if (username.length <= 2) return '*'.repeat(username.length) + '@' + domain;
        return username.substring(0, 2) + '*'.repeat(username.length - 2) + '@' + domain;
      
      case PIIType.NAME:
        const names = data.split(' ');
        return names.map(name => 
          name.length <= 2 ? '*'.repeat(name.length) : name[0] + '*'.repeat(name.length - 1)
        ).join(' ');
      
      case PIIType.STUDENT_ID:
        return data.length <= 4 ? '*'.repeat(data.length) : 
               data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
      
      case PIIType.IP_ADDRESS:
        const parts = data.split('.');
        return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.* ` : data;
      
      default:
        return data.length <= 4 ? '*'.repeat(data.length) : 
               data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
    }
  }
}

// Data classification registry
export const dataClassificationRegistry: Record<string, DataClassificationMetadata> = {
  // User profile data
  'user.email': {
    classification: DataClassification.RESTRICTED,
    piiTypes: [PIIType.EMAIL],
    ferpaCategory: FERPACategory.DIRECTORY_INFO,
    retentionPeriod: 2555, // 7 years
    encryptionRequired: true,
    auditRequired: true,
    description: 'User email address - FERPA directory information'
  },

  'user.name': {
    classification: DataClassification.RESTRICTED,
    piiTypes: [PIIType.NAME],
    ferpaCategory: FERPACategory.DIRECTORY_INFO,
    retentionPeriod: 2555,
    encryptionRequired: true,
    auditRequired: true,
    description: 'User full name - FERPA directory information'
  },

  'user.student_id': {
    classification: DataClassification.RESTRICTED,
    piiTypes: [PIIType.STUDENT_ID],
    ferpaCategory: FERPACategory.EDUCATIONAL_RECORD,
    retentionPeriod: 2555,
    encryptionRequired: true,
    auditRequired: true,
    description: 'Student identification number - FERPA educational record'
  },

  // Educational records
  'survey.responses': {
    classification: DataClassification.RESTRICTED,
    piiTypes: [PIIType.BEHAVIORAL_DATA],
    ferpaCategory: FERPACategory.EDUCATIONAL_RECORD,
    retentionPeriod: 2555,
    encryptionRequired: true,
    auditRequired: true,
    description: 'Student survey responses and belief profiles - FERPA educational record'
  },

  'debate.performance': {
    classification: DataClassification.RESTRICTED,
    piiTypes: [PIIType.BEHAVIORAL_DATA, PIIType.EDUCATIONAL_RECORD],
    ferpaCategory: FERPACategory.EDUCATIONAL_RECORD,
    retentionPeriod: 2555,
    encryptionRequired: true,
    auditRequired: true,
    description: 'Student debate performance and engagement metrics - FERPA educational record'
  },

  'debate.messages': {
    classification: DataClassification.CONFIDENTIAL,
    piiTypes: [PIIType.BEHAVIORAL_DATA],
    ferpaCategory: FERPACategory.EDUCATIONAL_RECORD,
    retentionPeriod: 1095, // 3 years
    encryptionRequired: true,
    auditRequired: true,
    description: 'Student debate messages and communications'
  },

  // System metadata
  'session.metadata': {
    classification: DataClassification.CONFIDENTIAL,
    piiTypes: [PIIType.IP_ADDRESS, PIIType.DEVICE_ID],
    ferpaCategory: FERPACategory.METADATA,
    retentionPeriod: 365, // 1 year
    encryptionRequired: false,
    auditRequired: true,
    description: 'Session metadata including IP addresses and device information'
  },

  // Analytics data
  'analytics.engagement': {
    classification: DataClassification.INTERNAL,
    piiTypes: [PIIType.BEHAVIORAL_DATA],
    ferpaCategory: FERPACategory.BEHAVIORAL_DATA,
    retentionPeriod: 1095,
    encryptionRequired: false,
    auditRequired: true,
    description: 'Aggregated engagement analytics and usage patterns'
  },

  // Public data
  'public.content': {
    classification: DataClassification.PUBLIC,
    piiTypes: [],
    retentionPeriod: 1095,
    encryptionRequired: false,
    auditRequired: false,
    description: 'Public content and non-sensitive information'
  }
};

// FERPA compliance utilities
export class FERPAComplianceManager {
  private dataProtection: DataProtectionManager;
  private auditLog: Array<{
    timestamp: string;
    action: string;
    dataType: string;
    userId?: string;
    details: any;
  }> = [];

  constructor() {
    this.dataProtection = new DataProtectionManager();
  }

  /**
   * Check if data access is FERPA compliant
   */
  checkFERPACompliance(
    dataType: string,
    requestingUserId: string,
    targetUserId: string,
    purpose: string
  ): { compliant: boolean; reason?: string; requiresConsent?: boolean } {
    const classification = dataClassificationRegistry[dataType];
    
    if (!classification) {
      return { compliant: false, reason: 'Unknown data type' };
    }

    // Directory information can be disclosed without consent (with exceptions)
    if (classification.ferpaCategory === FERPACategory.DIRECTORY_INFO) {
      this.logAccess('DIRECTORY_ACCESS', dataType, requestingUserId, { targetUserId, purpose });
      return { compliant: true };
    }

    // Educational records require consent or legitimate educational interest
    if (classification.ferpaCategory === FERPACategory.EDUCATIONAL_RECORD) {
      // Self-access is always allowed
      if (requestingUserId === targetUserId) {
        this.logAccess('SELF_ACCESS', dataType, requestingUserId, { purpose });
        return { compliant: true };
      }

      // Teacher access for legitimate educational interest
      if (purpose === 'educational_interest' && this.isEducator(requestingUserId)) {
        this.logAccess('EDUCATOR_ACCESS', dataType, requestingUserId, { targetUserId, purpose });
        return { compliant: true };
      }

      // Parent access (if applicable)
      if (purpose === 'parent_access' && this.isParent(requestingUserId, targetUserId)) {
        this.logAccess('PARENT_ACCESS', dataType, requestingUserId, { targetUserId, purpose });
        return { compliant: true };
      }

      // Otherwise, requires explicit consent
      return { 
        compliant: false, 
        reason: 'Educational record access requires consent or legitimate interest',
        requiresConsent: true 
      };
    }

    // Default to requiring consent for restricted data
    return { 
      compliant: false, 
      reason: 'Access requires explicit consent',
      requiresConsent: true 
    };
  }

  /**
   * Log data access for FERPA audit trail
   */
  private logAccess(action: string, dataType: string, userId: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      dataType,
      userId,
      details
    };

    this.auditLog.push(logEntry);

    // In production, persist to secure audit log
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to secure audit logging service
      console.log('FERPA_AUDIT:', JSON.stringify(logEntry));
    }
  }

  /**
   * Get FERPA audit log
   */
  getAuditLog(startDate?: Date, endDate?: Date): typeof this.auditLog {
    if (!startDate && !endDate) {
      return [...this.auditLog];
    }

    return this.auditLog.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      const afterStart = !startDate || entryDate >= startDate;
      const beforeEnd = !endDate || entryDate <= endDate;
      return afterStart && beforeEnd;
    });
  }

  /**
   * Check if user is an educator
   */
  private isEducator(userId: string): boolean {
    // TODO: Implement actual role checking
    // This would check against user roles in the database
    return false;
  }

  /**
   * Check if user is a parent of the target student
   */
  private isParent(parentUserId: string, studentUserId: string): boolean {
    // TODO: Implement actual parent-student relationship checking
    return false;
  }

  /**
   * Generate FERPA compliance report
   */
  generateComplianceReport(): {
    summary: {
      totalAccesses: number;
      complianceViolations: number;
      dataTypes: string[];
      timeRange: { start: string; end: string };
    };
    violations: Array<{
      timestamp: string;
      violation: string;
      dataType: string;
      userId: string;
    }>;
    recommendations: string[];
  } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentLogs = this.getAuditLog(thirtyDaysAgo, now);

    const dataTypes = [...new Set(recentLogs.map(log => log.dataType))];
    
    // TODO: Implement violation detection logic
    const violations: any[] = [];

    const recommendations = [
      'Regularly review data access patterns',
      'Ensure all educators complete FERPA training',
      'Implement automated compliance monitoring',
      'Review and update data retention policies',
      'Conduct annual FERPA compliance audit'
    ];

    return {
      summary: {
        totalAccesses: recentLogs.length,
        complianceViolations: violations.length,
        dataTypes,
        timeRange: {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString()
        }
      },
      violations,
      recommendations
    };
  }
}

// Export singleton instances
export const dataProtectionManager = new DataProtectionManager();
export const ferpaComplianceManager = new FERPAComplianceManager();

// Utility functions
export function classifyData(dataType: string): DataClassificationMetadata | null {
  return dataClassificationRegistry[dataType] || null;
}

export function requiresEncryption(dataType: string): boolean {
  const classification = classifyData(dataType);
  return classification?.encryptionRequired || false;
}

export function getRetentionPeriod(dataType: string): number {
  const classification = classifyData(dataType);
  return classification?.retentionPeriod || 365; // Default 1 year
}

export function isFERPAProtected(dataType: string): boolean {
  const classification = classifyData(dataType);
  return !!classification?.ferpaCategory;
}

export default {
  DataProtectionManager,
  FERPAComplianceManager,
  dataProtectionManager,
  ferpaComplianceManager,
  DataClassification,
  PIIType,
  FERPACategory,
  classifyData,
  requiresEncryption,
  getRetentionPeriod,
  isFERPAProtected
};
