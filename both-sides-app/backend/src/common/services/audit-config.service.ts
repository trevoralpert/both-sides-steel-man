import { Injectable } from '@nestjs/common';

export interface AuditPrivacyConfig {
  // Data retention settings
  retentionDays: {
    profile: number;
    user: number;
    admin: number;
    system: number;
  };
  
  // Field-level privacy controls
  sensitiveFields: string[];
  excludeFields: string[];
  maskingRules: {
    [field: string]: 'full' | 'partial' | 'hash' | 'exclude';
  };
  
  // Access control settings
  accessControl: {
    viewAuditLogs: string[]; // Roles that can view audit logs
    generateReports: string[]; // Roles that can generate reports
    deleteAuditLogs: string[]; // Roles that can delete audit logs
    exportAuditData: string[]; // Roles that can export audit data
  };
  
  // Compliance settings
  compliance: {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    hipaaCompliant: boolean;
    customRetentionRules: {
      [entityType: string]: number; // Days
    };
  };
}

@Injectable()
export class AuditConfigService {
  private readonly config: AuditPrivacyConfig = {
    retentionDays: {
      profile: 2555, // ~7 years for profile changes
      user: 1825,    // ~5 years for user actions
      admin: 3650,   // ~10 years for admin actions
      system: 365,   // ~1 year for system actions
    },
    
    sensitiveFields: [
      'password',
      'password_hash', 
      'token',
      'refresh_token',
      'access_token',
      'api_key',
      'secret',
      'private_key',
      'ssn',
      'social_security_number',
      'credit_card',
      'bank_account',
      'phone_number', // Add phone as sensitive
      'address',      // Add address as sensitive
      'date_of_birth', // Add DOB as sensitive
    ],
    
    excludeFields: [
      'password_hash',
      'refresh_token',
      'private_key',
      'api_key',
      'secret',
    ],
    
    maskingRules: {
      'email': 'partial',        // john.doe@example.com -> j***@e***
      'phone_number': 'partial', // +1234567890 -> +123***7890
      'ssn': 'hash',            // 123-45-6789 -> hash
      'credit_card': 'full',    // 1234-5678-9012-3456 -> ***
      'survey_responses': 'partial', // Show structure but mask content
      'belief_summary': 'partial',   // Show first/last few words
    },
    
    accessControl: {
      viewAuditLogs: ['ADMIN', 'SUPER_ADMIN'],
      generateReports: ['ADMIN', 'SUPER_ADMIN'],
      deleteAuditLogs: ['SUPER_ADMIN'], // Only super admins can delete
      exportAuditData: ['SUPER_ADMIN'], // Only super admins can export
    },
    
    compliance: {
      gdprCompliant: true,
      ccpaCompliant: true,
      hipaaCompliant: false, // Not required for this app
      customRetentionRules: {
        'profile_deletion': 30,    // Delete audit logs after 30 days for deleted profiles
        'user_deactivation': 90,  // Special retention for deactivated users
        'sensitive_data': 365,    // Shorter retention for sensitive data changes
      },
    },
  };

  /**
   * Get the current audit privacy configuration
   */
  getConfig(): AuditPrivacyConfig {
    return { ...this.config }; // Return a copy to prevent modification
  }

  /**
   * Get retention days for a specific entity type
   */
  getRetentionDays(entityType: string, actionType?: string): number {
    // Check for custom retention rules first
    const customKey = actionType ? `${entityType}_${actionType}` : entityType;
    if (this.config.compliance.customRetentionRules[customKey]) {
      return this.config.compliance.customRetentionRules[customKey];
    }
    
    // Use default retention days
    return this.config.retentionDays[entityType as keyof typeof this.config.retentionDays] || 
           this.config.retentionDays.system;
  }

  /**
   * Check if a field should be considered sensitive
   */
  isSensitiveField(fieldName: string): boolean {
    return this.config.sensitiveFields.some(sensitiveField => 
      fieldName.toLowerCase().includes(sensitiveField.toLowerCase())
    );
  }

  /**
   * Check if a field should be completely excluded from audit logs
   */
  isExcludedField(fieldName: string): boolean {
    return this.config.excludeFields.some(excludedField => 
      fieldName.toLowerCase().includes(excludedField.toLowerCase())
    );
  }

  /**
   * Get masking rule for a specific field
   */
  getMaskingRule(fieldName: string): 'full' | 'partial' | 'hash' | 'exclude' | null {
    const lowerFieldName = fieldName.toLowerCase();
    
    for (const [pattern, rule] of Object.entries(this.config.maskingRules)) {
      if (lowerFieldName.includes(pattern.toLowerCase())) {
        return rule;
      }
    }
    
    // Default behavior for sensitive fields
    if (this.isSensitiveField(fieldName)) {
      return 'full'; // Fully mask sensitive fields by default
    }
    
    return null; // No masking needed
  }

  /**
   * Check if a user role can perform a specific audit action
   */
  canPerformAuditAction(userRole: string, action: keyof AuditPrivacyConfig['accessControl']): boolean {
    const allowedRoles = this.config.accessControl[action];
    return allowedRoles.includes(userRole);
  }

  /**
   * Apply masking to a value based on field name and masking rule
   */
  applyMasking(fieldName: string, value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    const rule = this.getMaskingRule(fieldName);
    if (!rule) {
      return value;
    }

    const stringValue = String(value);
    
    switch (rule) {
      case 'full':
        return '***REDACTED***';
        
      case 'partial':
        if (fieldName.toLowerCase().includes('email')) {
          return this.maskEmail(stringValue);
        } else if (fieldName.toLowerCase().includes('phone')) {
          return this.maskPhone(stringValue);
        } else if (stringValue.length > 10) {
          // For long strings, show first 3 and last 3 characters
          return stringValue.substring(0, 3) + '***' + stringValue.substring(stringValue.length - 3);
        } else {
          return stringValue.substring(0, 1) + '***';
        }
        
      case 'hash':
        // In a real implementation, use a proper hash function
        return `hash_${this.simpleHash(stringValue)}`;
        
      case 'exclude':
        return '[EXCLUDED]';
        
      default:
        return value;
    }
  }

  /**
   * Mask email addresses: john.doe@example.com -> j***@e***
   */
  private maskEmail(email: string): string {
    if (!email.includes('@')) {
      return this.applyMasking('generic', email);
    }
    
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
    const maskedDomain = domain.length > 1 ? domain[0] + '***' : '***';
    
    return `${maskedLocal}@${maskedDomain}`;
  }

  /**
   * Mask phone numbers: +1234567890 -> +123***7890
   */
  private maskPhone(phone: string): string {
    if (phone.length < 6) {
      return '***';
    }
    
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length < 6) {
      return '***';
    }
    
    const prefix = phone.substring(0, 4); // Keep country code and first digit
    const suffix = cleaned.slice(-4);      // Keep last 4 digits
    
    return `${prefix}***${suffix}`;
  }

  /**
   * Simple hash function for demonstration (use proper crypto in production)
   */
  private simpleHash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get compliance settings
   */
  getComplianceSettings() {
    return { ...this.config.compliance };
  }

  /**
   * Check if audit logging is compliant with specific regulation
   */
  isCompliantWith(regulation: 'gdpr' | 'ccpa' | 'hipaa'): boolean {
    switch (regulation.toLowerCase()) {
      case 'gdpr':
        return this.config.compliance.gdprCompliant;
      case 'ccpa':
        return this.config.compliance.ccpaCompliant;
      case 'hipaa':
        return this.config.compliance.hipaaCompliant;
      default:
        return false;
    }
  }

  /**
   * Get data retention policy summary
   */
  getRetentionPolicySummary() {
    return {
      defaultRetention: this.config.retentionDays,
      customRules: this.config.compliance.customRetentionRules,
      totalPolicies: Object.keys(this.config.retentionDays).length + 
                    Object.keys(this.config.compliance.customRetentionRules).length,
    };
  }
}
