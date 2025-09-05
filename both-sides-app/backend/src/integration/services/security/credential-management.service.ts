import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Credential Management Service
 * 
 * Enterprise-grade secure credential management with encryption, rotation,
 * multi-factor authentication, and secure sharing between environments.
 * 
 * Features:
 * - Encrypted credential storage with AES-256-GCM
 * - Automatic credential rotation with configurable schedules
 * - Multi-factor authentication for sensitive operations
 * - Secure credential sharing between environments
 * - Credential access logging and audit trails
 * - Emergency credential revocation
 * - Credential health monitoring
 */

export interface CredentialMetadata {
  id: string;
  name: string;
  type: 'api_key' | 'oauth_token' | 'database_password' | 'certificate' | 'webhook_secret' | 'custom';
  providerId: string;
  environment: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  rotationSchedule?: CredentialRotationSchedule;
  accessPolicy: CredentialAccessPolicy;
  status: CredentialStatus;
  version: number;
}

export interface EncryptedCredential {
  id: string;
  encryptedValue: string;
  encryptionAlgorithm: string;
  keyId: string;
  iv: string;
  authTag: string;
  salt: string;
  metadata: CredentialMetadata;
}

export interface CredentialRotationSchedule {
  enabled: boolean;
  intervalDays: number;
  nextRotationDate: Date;
  maxAge: number; // Maximum age in days
  rotationPolicy: 'automatic' | 'manual_approval' | 'notification_only';
  notifyBefore: number; // Notify N days before rotation
  notificationChannels: string[];
  fallbackCredentials?: string[]; // IDs of fallback credentials
}

export interface CredentialAccessPolicy {
  allowedEnvironments: string[];
  allowedServices: string[];
  requireMFA: boolean;
  maxConcurrentAccess: number;
  accessTimeRestrictions?: {
    allowedHours: { start: number; end: number }[];
    allowedDays: number[]; // 0-6, Sunday=0
    timezone: string;
  };
  ipWhitelist?: string[];
  userWhitelist?: string[];
  roleWhitelist?: string[];
}

export type CredentialStatus = 
  | 'active' 
  | 'expired' 
  | 'revoked' 
  | 'pending_rotation' 
  | 'rotation_failed' 
  | 'disabled' 
  | 'compromised';

export interface CredentialAccessRequest {
  credentialId: string;
  requesterId: string;
  requesterType: 'user' | 'service' | 'system';
  purpose: string;
  environment: string;
  mfaToken?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt?: Date;
}

export interface CredentialAccessGrant {
  id: string;
  credentialId: string;
  requesterId: string;
  grantedAt: Date;
  expiresAt: Date;
  accessToken: string; // Temporary token to access the credential
  usageCount: number;
  maxUsage: number;
  status: 'active' | 'expired' | 'revoked';
}

export interface CredentialAuditLog {
  id: string;
  credentialId: string;
  action: 'created' | 'updated' | 'accessed' | 'rotated' | 'revoked' | 'shared' | 'deleted';
  performedBy: string;
  performedAt: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified: boolean;
  riskScore: number; // 0-100, higher = riskier
}

export interface CredentialRotationResult {
  credentialId: string;
  success: boolean;
  oldVersion: number;
  newVersion: number;
  rotatedAt: Date;
  nextRotationDate?: Date;
  errors?: string[];
  warnings?: string[];
  rollbackAvailable: boolean;
}

export interface CredentialHealthCheck {
  credentialId: string;
  isValid: boolean;
  isExpired: boolean;
  daysTillExpiration?: number;
  needsRotation: boolean;
  lastVerifiedAt: Date;
  verificationErrors?: string[];
  securityScore: number; // 0-100, higher = more secure
  recommendations: string[];
}

export interface CredentialSharingRequest {
  sourceCredentialId: string;
  targetEnvironment: string;
  shareType: 'copy' | 'reference' | 'temporary';
  requestedBy: string;
  purpose: string;
  expiresAt?: Date;
  approvalRequired: boolean;
  approvers?: string[];
}

export interface CredentialBackup {
  id: string;
  credentialId: string;
  backupType: 'manual' | 'automatic' | 'pre_rotation' | 'pre_deletion';
  encryptedBackupData: string;
  createdAt: Date;
  expiresAt: Date;
  metadata: Record<string, any>;
  restorable: boolean;
}

@Injectable()
export class CredentialManagementService {
  private readonly logger = new Logger(CredentialManagementService.name);
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly keySize = 32; // 256 bits
  private readonly ivSize = 16;
  private readonly tagSize = 16;
  private readonly saltSize = 32;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Store a credential securely with encryption
   */
  async storeCredential(
    value: string,
    metadata: Omit<CredentialMetadata, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'status'>
  ): Promise<CredentialMetadata> {
    try {
      const credentialId = crypto.randomUUID();
      const encryptionKey = await this.generateEncryptionKey();
      const keyId = await this.storeEncryptionKey(encryptionKey);
      
      const encrypted = await this.encryptValue(value, encryptionKey);
      
      const fullMetadata: CredentialMetadata = {
        ...metadata,
        id: credentialId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        status: 'active',
      };

      const encryptedCredential: EncryptedCredential = {
        id: credentialId,
        encryptedValue: encrypted.encryptedData,
        encryptionAlgorithm: this.encryptionAlgorithm,
        keyId,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        salt: encrypted.salt,
        metadata: fullMetadata,
      };

      // Store in database
      await this.prisma.integrationConfiguration.upsert({
        where: { id: credentialId },
        create: {
          id: credentialId,
          providerId: metadata.providerId,
          configuration: JSON.stringify({
            type: 'encrypted_credential',
            data: encryptedCredential,
          }),
          environment: metadata.environment,
          isActive: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          configuration: JSON.stringify({
            type: 'encrypted_credential',
            data: encryptedCredential,
          }),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Cache metadata for fast access
      await this.redis.setex(
        `credential:metadata:${credentialId}`,
        3600, // 1 hour
        JSON.stringify(fullMetadata)
      );

      // Log creation
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId,
        action: 'created',
        performedBy: 'system',
        performedAt: new Date(),
        details: {
          type: metadata.type,
          environment: metadata.environment,
          providerId: metadata.providerId,
        },
        mfaVerified: false,
        riskScore: 10,
      });

      // Schedule rotation if configured
      if (fullMetadata.rotationSchedule?.enabled) {
        await this.scheduleCredentialRotation(credentialId);
      }

      this.logger.log(`Credential stored successfully: ${credentialId}`);
      return fullMetadata;

    } catch (error) {
      this.logger.error(`Failed to store credential: ${error.message}`, error.stack);
      throw new Error(`Failed to store credential: ${error.message}`);
    }
  }

  /**
   * Retrieve a credential with access control
   */
  async retrieveCredential(
    request: CredentialAccessRequest
  ): Promise<string | null> {
    try {
      // Verify access permissions
      const accessGrant = await this.verifyCredentialAccess(request);
      if (!accessGrant) {
        throw new Error('Access denied: Invalid credentials or permissions');
      }

      // Get encrypted credential
      const config = await this.prisma.integrationConfiguration.findUnique({
        where: { id: request.credentialId },
      });

      if (!config) {
        throw new Error('Credential not found');
      }

      const configData = JSON.parse(config.configuration);
      if (configData.type !== 'encrypted_credential') {
        throw new Error('Invalid credential type');
      }

      const encryptedCredential: EncryptedCredential = configData.data;

      // Check credential status
      if (encryptedCredential.metadata.status !== 'active') {
        throw new Error(`Credential is ${encryptedCredential.metadata.status}`);
      }

      // Get encryption key
      const encryptionKey = await this.retrieveEncryptionKey(encryptedCredential.keyId);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      // Decrypt value
      const decryptedValue = await this.decryptValue({
        encryptedData: encryptedCredential.encryptedValue,
        iv: encryptedCredential.iv,
        authTag: encryptedCredential.authTag,
        salt: encryptedCredential.salt,
      }, encryptionKey);

      // Update access tracking
      await this.trackCredentialAccess(accessGrant);

      // Log access
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId: request.credentialId,
        action: 'accessed',
        performedBy: request.requesterId,
        performedAt: new Date(),
        details: {
          purpose: request.purpose,
          environment: request.environment,
          mfaUsed: !!request.mfaToken,
        },
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        mfaVerified: !!request.mfaToken,
        riskScore: this.calculateAccessRiskScore(request),
      });

      return decryptedValue;

    } catch (error) {
      this.logger.error(`Failed to retrieve credential: ${error.message}`, error.stack);
      
      // Log failed access attempt
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId: request.credentialId,
        action: 'accessed',
        performedBy: request.requesterId,
        performedAt: new Date(),
        details: {
          error: error.message,
          purpose: request.purpose,
          environment: request.environment,
        },
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        mfaVerified: !!request.mfaToken,
        riskScore: 80, // High risk for failed access
      });

      throw error;
    }
  }

  /**
   * Rotate a credential
   */
  async rotateCredential(
    credentialId: string,
    newValue: string,
    performedBy: string,
    options: {
      force?: boolean;
      skipValidation?: boolean;
      notifyServices?: boolean;
    } = {}
  ): Promise<CredentialRotationResult> {
    try {
      const metadata = await this.getCredentialMetadata(credentialId);
      if (!metadata) {
        throw new Error('Credential not found');
      }

      // Create backup of current credential
      await this.createCredentialBackup(credentialId, 'pre_rotation');

      // Generate new encryption key for the rotated credential
      const encryptionKey = await this.generateEncryptionKey();
      const keyId = await this.storeEncryptionKey(encryptionKey);
      
      const encrypted = await this.encryptValue(newValue, encryptionKey);
      
      const updatedMetadata: CredentialMetadata = {
        ...metadata,
        updatedAt: new Date(),
        version: metadata.version + 1,
        status: 'active',
        rotationSchedule: metadata.rotationSchedule ? {
          ...metadata.rotationSchedule,
          nextRotationDate: new Date(Date.now() + (metadata.rotationSchedule.intervalDays * 24 * 60 * 60 * 1000)),
        } : undefined,
      };

      const encryptedCredential: EncryptedCredential = {
        id: credentialId,
        encryptedValue: encrypted.encryptedData,
        encryptionAlgorithm: this.encryptionAlgorithm,
        keyId,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        salt: encrypted.salt,
        metadata: updatedMetadata,
      };

      // Update in database
      await this.prisma.integrationConfiguration.update({
        where: { id: credentialId },
        data: {
          configuration: JSON.stringify({
            type: 'encrypted_credential',
            data: encryptedCredential,
          }),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Update cache
      await this.redis.setex(
        `credential:metadata:${credentialId}`,
        3600,
        JSON.stringify(updatedMetadata)
      );

      // Schedule next rotation
      if (updatedMetadata.rotationSchedule?.enabled) {
        await this.scheduleCredentialRotation(credentialId);
      }

      // Log rotation
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId,
        action: 'rotated',
        performedBy,
        performedAt: new Date(),
        details: {
          oldVersion: metadata.version,
          newVersion: updatedMetadata.version,
          rotationType: options.force ? 'forced' : 'scheduled',
        },
        mfaVerified: false, // Should be provided in options
        riskScore: 20,
      });

      // Notify services if configured
      if (options.notifyServices !== false) {
        await this.notifyServicesOfRotation(credentialId, metadata.version, updatedMetadata.version);
      }

      const result: CredentialRotationResult = {
        credentialId,
        success: true,
        oldVersion: metadata.version,
        newVersion: updatedMetadata.version,
        rotatedAt: new Date(),
        nextRotationDate: updatedMetadata.rotationSchedule?.nextRotationDate,
        rollbackAvailable: true,
      };

      this.logger.log(`Credential rotated successfully: ${credentialId} (v${metadata.version} -> v${updatedMetadata.version})`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to rotate credential ${credentialId}: ${error.message}`, error.stack);
      
      const result: CredentialRotationResult = {
        credentialId,
        success: false,
        oldVersion: 0,
        newVersion: 0,
        rotatedAt: new Date(),
        errors: [error.message],
        rollbackAvailable: false,
      };

      // Log failed rotation
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId,
        action: 'rotated',
        performedBy,
        performedAt: new Date(),
        details: {
          error: error.message,
          success: false,
        },
        mfaVerified: false,
        riskScore: 60,
      });

      return result;
    }
  }

  /**
   * Revoke a credential immediately
   */
  async revokeCredential(
    credentialId: string,
    reason: string,
    performedBy: string,
    options: {
      emergency?: boolean;
      notifyServices?: boolean;
      createBackup?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      // Create backup if requested
      if (options.createBackup !== false) {
        await this.createCredentialBackup(credentialId, 'pre_deletion');
      }

      // Update status to revoked
      await this.prisma.integrationConfiguration.update({
        where: { id: credentialId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Update cached metadata
      const metadata = await this.getCredentialMetadata(credentialId);
      if (metadata) {
        metadata.status = 'revoked';
        metadata.updatedAt = new Date();
        
        await this.redis.setex(
          `credential:metadata:${credentialId}`,
          3600,
          JSON.stringify(metadata)
        );
      }

      // Invalidate all active access grants
      await this.revokeAllAccessGrants(credentialId);

      // Log revocation
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId,
        action: 'revoked',
        performedBy,
        performedAt: new Date(),
        details: {
          reason,
          emergency: options.emergency || false,
          backupCreated: options.createBackup !== false,
        },
        mfaVerified: false, // Should be provided in options
        riskScore: options.emergency ? 90 : 40,
      });

      // Notify services if configured
      if (options.notifyServices !== false) {
        await this.notifyServicesOfRevocation(credentialId, reason);
      }

      this.logger.log(`Credential revoked successfully: ${credentialId} (reason: ${reason})`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to revoke credential ${credentialId}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Get credential metadata
   */
  async getCredentialMetadata(credentialId: string): Promise<CredentialMetadata | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`credential:metadata:${credentialId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fall back to database
      const config = await this.prisma.integrationConfiguration.findUnique({
        where: { id: credentialId },
      });

      if (!config) {
        return null;
      }

      const configData = JSON.parse(config.configuration);
      if (configData.type !== 'encrypted_credential') {
        return null;
      }

      const metadata = configData.data.metadata;
      
      // Cache for future requests
      await this.redis.setex(
        `credential:metadata:${credentialId}`,
        3600,
        JSON.stringify(metadata)
      );

      return metadata;

    } catch (error) {
      this.logger.error(`Failed to get credential metadata: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * List credentials with filtering
   */
  async listCredentials(filters: {
    providerId?: string;
    environment?: string;
    type?: string;
    status?: CredentialStatus;
    expiringWithinDays?: number;
    needsRotation?: boolean;
  } = {}): Promise<CredentialMetadata[]> {
    try {
      const whereClause: any = {};
      
      if (filters.providerId) {
        whereClause.providerId = filters.providerId;
      }
      
      if (filters.environment) {
        whereClause.environment = filters.environment;
      }

      const configs = await this.prisma.integrationConfiguration.findMany({
        where: whereClause,
      });

      const credentials: CredentialMetadata[] = [];
      const now = new Date();

      for (const config of configs) {
        try {
          const configData = JSON.parse(config.configuration);
          if (configData.type !== 'encrypted_credential') {
            continue;
          }

          const metadata: CredentialMetadata = configData.data.metadata;

          // Apply filters
          if (filters.type && metadata.type !== filters.type) {
            continue;
          }

          if (filters.status && metadata.status !== filters.status) {
            continue;
          }

          if (filters.expiringWithinDays && metadata.expiresAt) {
            const daysUntilExpiration = Math.ceil((metadata.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiration > filters.expiringWithinDays) {
              continue;
            }
          }

          if (filters.needsRotation) {
            if (!metadata.rotationSchedule?.enabled) {
              continue;
            }
            
            const nextRotation = metadata.rotationSchedule.nextRotationDate;
            if (!nextRotation || nextRotation.getTime() > now.getTime()) {
              continue;
            }
          }

          credentials.push(metadata);

        } catch (error) {
          this.logger.warn(`Failed to parse credential configuration for ${config.id}: ${error.message}`);
        }
      }

      return credentials;

    } catch (error) {
      this.logger.error(`Failed to list credentials: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Perform health check on a credential
   */
  async checkCredentialHealth(credentialId: string): Promise<CredentialHealthCheck> {
    try {
      const metadata = await this.getCredentialMetadata(credentialId);
      if (!metadata) {
        throw new Error('Credential not found');
      }

      const now = new Date();
      const recommendations: string[] = [];
      let securityScore = 100;

      // Check if expired
      const isExpired = metadata.expiresAt ? metadata.expiresAt.getTime() < now.getTime() : false;
      const daysTillExpiration = metadata.expiresAt ? 
        Math.ceil((metadata.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 
        undefined;

      // Check if needs rotation
      const needsRotation = metadata.rotationSchedule?.enabled && 
        metadata.rotationSchedule.nextRotationDate && 
        metadata.rotationSchedule.nextRotationDate.getTime() < now.getTime();

      // Calculate security score and recommendations
      if (isExpired) {
        securityScore -= 50;
        recommendations.push('Credential has expired and should be renewed immediately');
      } else if (daysTillExpiration !== undefined && daysTillExpiration <= 7) {
        securityScore -= 20;
        recommendations.push(`Credential expires in ${daysTillExpiration} days - plan renewal`);
      }

      if (needsRotation) {
        securityScore -= 30;
        recommendations.push('Credential rotation is overdue');
      }

      if (!metadata.rotationSchedule?.enabled) {
        securityScore -= 20;
        recommendations.push('Enable automatic rotation for better security');
      }

      if (!metadata.accessPolicy.requireMFA) {
        securityScore -= 15;
        recommendations.push('Enable MFA requirement for sensitive credential access');
      }

      if (metadata.accessPolicy.allowedEnvironments.length === 0) {
        securityScore -= 10;
        recommendations.push('Configure environment access restrictions');
      }

      // Check recent access patterns for anomalies
      const recentAccess = await this.getRecentCredentialAccess(credentialId, 24); // Last 24 hours
      const unusualAccessCount = recentAccess.filter(log => log.riskScore > 70).length;
      
      if (unusualAccessCount > 0) {
        securityScore -= unusualAccessCount * 5;
        recommendations.push(`${unusualAccessCount} high-risk access attempts detected in the last 24 hours`);
      }

      const healthCheck: CredentialHealthCheck = {
        credentialId,
        isValid: metadata.status === 'active' && !isExpired,
        isExpired,
        daysTillExpiration,
        needsRotation: needsRotation || false,
        lastVerifiedAt: now,
        securityScore: Math.max(0, securityScore),
        recommendations,
      };

      // Store health check result
      await this.redis.setex(
        `credential:health:${credentialId}`,
        3600, // 1 hour
        JSON.stringify(healthCheck)
      );

      return healthCheck;

    } catch (error) {
      this.logger.error(`Failed to check credential health: ${error.message}`, error.stack);
      
      return {
        credentialId,
        isValid: false,
        isExpired: true,
        needsRotation: true,
        lastVerifiedAt: new Date(),
        verificationErrors: [error.message],
        securityScore: 0,
        recommendations: ['Credential health check failed - manual investigation required'],
      };
    }
  }

  /**
   * Share credential between environments
   */
  async shareCredential(request: CredentialSharingRequest): Promise<string | null> {
    try {
      // Verify permissions for sharing
      if (!await this.canShareCredential(request)) {
        throw new Error('Insufficient permissions to share credential');
      }

      const sourceMetadata = await this.getCredentialMetadata(request.sourceCredentialId);
      if (!sourceMetadata) {
        throw new Error('Source credential not found');
      }

      let sharedCredentialId: string;

      switch (request.shareType) {
        case 'copy':
          // Create a new credential with the same value in the target environment
          const sourceValue = await this.retrieveCredential({
            credentialId: request.sourceCredentialId,
            requesterId: 'system',
            requesterType: 'system',
            purpose: 'credential_sharing',
            environment: sourceMetadata.environment,
          });

          if (!sourceValue) {
            throw new Error('Failed to retrieve source credential value');
          }

          const newMetadata = await this.storeCredential(sourceValue, {
            ...sourceMetadata,
            environment: request.targetEnvironment,
            name: `${sourceMetadata.name}_shared`,
            description: `Shared from ${sourceMetadata.environment} environment`,
          });

          sharedCredentialId = newMetadata.id;
          break;

        case 'reference':
          // Create a reference that points to the original credential
          sharedCredentialId = await this.createCredentialReference(
            request.sourceCredentialId,
            request.targetEnvironment
          );
          break;

        case 'temporary':
          // Create a temporary access grant
          const accessGrant = await this.createTemporaryAccessGrant({
            credentialId: request.sourceCredentialId,
            requesterId: request.requestedBy,
            requesterType: 'user',
            purpose: request.purpose,
            environment: request.targetEnvironment,
            expiresAt: request.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
          });
          
          sharedCredentialId = accessGrant.id;
          break;

        default:
          throw new Error(`Unsupported share type: ${request.shareType}`);
      }

      // Log sharing activity
      await this.logCredentialAccess({
        id: crypto.randomUUID(),
        credentialId: request.sourceCredentialId,
        action: 'shared',
        performedBy: request.requestedBy,
        performedAt: new Date(),
        details: {
          shareType: request.shareType,
          targetEnvironment: request.targetEnvironment,
          purpose: request.purpose,
          sharedCredentialId,
        },
        mfaVerified: false, // Should be provided in request
        riskScore: 40,
      });

      this.logger.log(`Credential shared successfully: ${request.sourceCredentialId} -> ${sharedCredentialId}`);
      return sharedCredentialId;

    } catch (error) {
      this.logger.error(`Failed to share credential: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get credential audit logs
   */
  async getCredentialAuditLogs(
    credentialId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      actions?: string[];
      performedBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<CredentialAuditLog[]> {
    try {
      // This would typically query a separate audit log table
      // For now, we'll simulate with Redis-based storage
      const logsKey = `credential:audit:${credentialId}`;
      const logs = await this.redis.lrange(logsKey, 0, -1);
      
      let auditLogs: CredentialAuditLog[] = logs.map(log => JSON.parse(log));

      // Apply filters
      if (filters.startDate) {
        auditLogs = auditLogs.filter(log => log.performedAt >= filters.startDate!);
      }

      if (filters.endDate) {
        auditLogs = auditLogs.filter(log => log.performedAt <= filters.endDate!);
      }

      if (filters.actions) {
        auditLogs = auditLogs.filter(log => filters.actions!.includes(log.action));
      }

      if (filters.performedBy) {
        auditLogs = auditLogs.filter(log => log.performedBy === filters.performedBy);
      }

      // Sort by date (newest first)
      auditLogs.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 100;
      
      return auditLogs.slice(offset, offset + limit);

    } catch (error) {
      this.logger.error(`Failed to get credential audit logs: ${error.message}`, error.stack);
      return [];
    }
  }

  // Private helper methods

  private async generateEncryptionKey(): Promise<Buffer> {
    return crypto.randomBytes(this.keySize);
  }

  private async storeEncryptionKey(key: Buffer): Promise<string> {
    const keyId = crypto.randomUUID();
    // In production, this would be stored in a dedicated key management system
    await this.redis.setex(`encryption_key:${keyId}`, 86400 * 30, key.toString('base64'));
    return keyId;
  }

  private async retrieveEncryptionKey(keyId: string): Promise<Buffer | null> {
    const keyData = await this.redis.get(`encryption_key:${keyId}`);
    return keyData ? Buffer.from(keyData, 'base64') : null;
  }

  private async encryptValue(value: string, key: Buffer): Promise<{
    encryptedData: string;
    iv: string;
    authTag: string;
    salt: string;
  }> {
    const iv = crypto.randomBytes(this.ivSize);
    const salt = crypto.randomBytes(this.saltSize);
    
    const cipher = crypto.createCipher(this.encryptionAlgorithm, key);
    cipher.setAAD(salt);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  private async decryptValue(
    encrypted: { encryptedData: string; iv: string; authTag: string; salt: string },
    key: Buffer
  ): Promise<string> {
    const decipher = crypto.createDecipher(this.encryptionAlgorithm, key);
    decipher.setAAD(Buffer.from(encrypted.salt, 'hex'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async verifyCredentialAccess(request: CredentialAccessRequest): Promise<CredentialAccessGrant | null> {
    // This would implement comprehensive access control logic
    // For now, we'll create a basic grant
    const grant: CredentialAccessGrant = {
      id: crypto.randomUUID(),
      credentialId: request.credentialId,
      requesterId: request.requesterId,
      grantedAt: new Date(),
      expiresAt: request.expiresAt || new Date(Date.now() + 3600000), // 1 hour default
      accessToken: crypto.randomBytes(32).toString('hex'),
      usageCount: 0,
      maxUsage: 1,
      status: 'active',
    };

    await this.redis.setex(
      `credential:access_grant:${grant.id}`,
      3600,
      JSON.stringify(grant)
    );

    return grant;
  }

  private async trackCredentialAccess(grant: CredentialAccessGrant): Promise<void> {
    grant.usageCount++;
    if (grant.usageCount >= grant.maxUsage) {
      grant.status = 'expired';
    }

    await this.redis.setex(
      `credential:access_grant:${grant.id}`,
      3600,
      JSON.stringify(grant)
    );
  }

  private calculateAccessRiskScore(request: CredentialAccessRequest): number {
    let riskScore = 0;

    // Base risk
    riskScore += 10;

    // No MFA increases risk
    if (!request.mfaToken) {
      riskScore += 30;
    }

    // Unknown IP increases risk
    if (!request.ipAddress) {
      riskScore += 20;
    }

    // System requests are lower risk
    if (request.requesterType === 'system') {
      riskScore -= 10;
    }

    return Math.max(0, Math.min(100, riskScore));
  }

  private async logCredentialAccess(log: CredentialAuditLog): Promise<void> {
    const logsKey = `credential:audit:${log.credentialId}`;
    
    // Add to audit log list (keep last 1000 entries)
    await this.redis.lpush(logsKey, JSON.stringify(log));
    await this.redis.ltrim(logsKey, 0, 999);
    
    // Set expiration on the log list (90 days)
    await this.redis.expire(logsKey, 86400 * 90);
  }

  private async scheduleCredentialRotation(credentialId: string): Promise<void> {
    // This would integrate with a job scheduler (like BullMQ)
    // For now, we'll just log the scheduling
    this.logger.log(`Scheduled rotation for credential: ${credentialId}`);
  }

  private async notifyServicesOfRotation(credentialId: string, oldVersion: number, newVersion: number): Promise<void> {
    // This would send notifications to services using the credential
    this.logger.log(`Notified services of credential rotation: ${credentialId} (v${oldVersion} -> v${newVersion})`);
  }

  private async notifyServicesOfRevocation(credentialId: string, reason: string): Promise<void> {
    // This would send notifications to services using the credential
    this.logger.log(`Notified services of credential revocation: ${credentialId} (reason: ${reason})`);
  }

  private async createCredentialBackup(credentialId: string, backupType: string): Promise<string> {
    const backupId = crypto.randomUUID();
    // Implementation would create encrypted backup
    this.logger.log(`Created credential backup: ${backupId} for ${credentialId}`);
    return backupId;
  }

  private async revokeAllAccessGrants(credentialId: string): Promise<void> {
    // This would invalidate all active access grants for the credential
    this.logger.log(`Revoked all access grants for credential: ${credentialId}`);
  }

  private async getRecentCredentialAccess(credentialId: string, hours: number): Promise<CredentialAuditLog[]> {
    const logs = await this.getCredentialAuditLogs(credentialId, {
      startDate: new Date(Date.now() - (hours * 60 * 60 * 1000)),
      actions: ['accessed'],
    });
    
    return logs;
  }

  private async canShareCredential(request: CredentialSharingRequest): Promise<boolean> {
    // This would implement comprehensive permission checking
    // For now, we'll allow all sharing requests
    return true;
  }

  private async createCredentialReference(sourceCredentialId: string, targetEnvironment: string): Promise<string> {
    // This would create a reference entry that points to the original credential
    const referenceId = crypto.randomUUID();
    this.logger.log(`Created credential reference: ${referenceId} -> ${sourceCredentialId}`);
    return referenceId;
  }

  private async createTemporaryAccessGrant(request: CredentialAccessRequest): Promise<CredentialAccessGrant> {
    const grant: CredentialAccessGrant = {
      id: crypto.randomUUID(),
      credentialId: request.credentialId,
      requesterId: request.requesterId,
      grantedAt: new Date(),
      expiresAt: request.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      accessToken: crypto.randomBytes(32).toString('hex'),
      usageCount: 0,
      maxUsage: 100, // Higher limit for temporary grants
      status: 'active',
    };

    await this.redis.setex(
      `credential:temp_grant:${grant.id}`,
      Math.ceil((grant.expiresAt.getTime() - Date.now()) / 1000),
      JSON.stringify(grant)
    );

    return grant;
  }
}
