/**
 * Encryption Manager
 * Comprehensive data encryption and key management system
 */

import crypto from 'crypto';
import { promisify } from 'util';

// Key types for different encryption purposes
export enum KeyType {
  DATABASE_FIELD = 'database_field',
  FILE_STORAGE = 'file_storage',
  API_TRANSPORT = 'api_transport',
  SESSION_DATA = 'session_data',
  BACKUP_ENCRYPTION = 'backup_encryption',
  EXPORT_DATA = 'export_data'
}

// Encryption algorithms supported
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
  CHACHA20_POLY1305 = 'chacha20-poly1305',
  RSA_OAEP = 'rsa-oaep'
}

export interface EncryptionKey {
  id: string;
  type: KeyType;
  algorithm: EncryptionAlgorithm;
  keyData: Buffer;
  version: number;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
  rotationSchedule: string; // cron expression
  metadata: {
    purpose: string;
    environment: string;
    createdBy: string;
    lastUsed?: Date;
    usageCount: number;
  };
}

export interface EncryptionResult {
  encryptedData: string; // base64 encoded
  keyId: string;
  keyVersion: number;
  algorithm: EncryptionAlgorithm;
  iv?: string; // initialization vector, base64 encoded
  authTag?: string; // authentication tag for AEAD, base64 encoded
  timestamp: Date;
}

export interface KeyRotationPolicy {
  keyType: KeyType;
  rotationInterval: number; // days
  maxKeyAge: number; // days
  retentionPeriod: number; // days for old keys
  autoRotation: boolean;
  notificationThreshold: number; // days before expiration
}

export class EncryptionManager {
  private keys: Map<string, EncryptionKey> = new Map();
  private rotationPolicies: Map<KeyType, KeyRotationPolicy> = new Map();
  private keyDerivationSalt: Buffer;

  constructor() {
    this.initializeEncryption();
  }

  private initializeEncryption(): void {
    console.log('🔐 Initializing Encryption Manager');
    
    // Initialize key derivation salt
    const saltSeed = process.env.ENCRYPTION_SALT_SEED || 'default_salt_seed';
    this.keyDerivationSalt = crypto.scryptSync(saltSeed, 'salt', 32);

    // Set up default rotation policies
    this.setupDefaultRotationPolicies();
    
    // Load existing keys
    this.loadEncryptionKeys();
    
    // Schedule key rotation checks
    this.scheduleKeyRotationChecks();
  }

  private setupDefaultRotationPolicies(): void {
    const defaultPolicies: Array<[KeyType, KeyRotationPolicy]> = [
      [KeyType.DATABASE_FIELD, {
        keyType: KeyType.DATABASE_FIELD,
        rotationInterval: 90, // 3 months
        maxKeyAge: 365, // 1 year
        retentionPeriod: 2555, // 7 years (FERPA compliance)
        autoRotation: true,
        notificationThreshold: 30
      }],
      [KeyType.FILE_STORAGE, {
        keyType: KeyType.FILE_STORAGE,
        rotationInterval: 180, // 6 months
        maxKeyAge: 730, // 2 years
        retentionPeriod: 2555, // 7 years
        autoRotation: true,
        notificationThreshold: 30
      }],
      [KeyType.API_TRANSPORT, {
        keyType: KeyType.API_TRANSPORT,
        rotationInterval: 30, // 1 month
        maxKeyAge: 90, // 3 months
        retentionPeriod: 365, // 1 year
        autoRotation: true,
        notificationThreshold: 7
      }],
      [KeyType.SESSION_DATA, {
        keyType: KeyType.SESSION_DATA,
        rotationInterval: 7, // 1 week
        maxKeyAge: 30, // 1 month
        retentionPeriod: 90, // 3 months
        autoRotation: true,
        notificationThreshold: 2
      }]
    ];

    defaultPolicies.forEach(([keyType, policy]) => {
      this.rotationPolicies.set(keyType, policy);
    });
  }

  /**
   * Generate a new encryption key
   */
  async generateKey(
    type: KeyType,
    algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
    purpose: string = 'Data encryption',
    customMetadata: any = {}
  ): Promise<EncryptionKey> {
    const keyId = this.generateKeyId(type);
    const keySize = this.getKeySize(algorithm);
    
    // Generate cryptographically secure random key
    const keyData = crypto.randomBytes(keySize);
    
    // Get rotation policy
    const policy = this.rotationPolicies.get(type);
    const expiresAt = policy ? new Date(Date.now() + policy.maxKeyAge * 24 * 60 * 60 * 1000) : undefined;

    const key: EncryptionKey = {
      id: keyId,
      type,
      algorithm,
      keyData,
      version: 1,
      createdAt: new Date(),
      expiresAt,
      active: true,
      rotationSchedule: policy?.autoRotation ? this.generateCronSchedule(policy.rotationInterval) : '',
      metadata: {
        purpose,
        environment: process.env.NODE_ENV || 'development',
        createdBy: 'system',
        usageCount: 0,
        ...customMetadata
      }
    };

    // Store key
    this.keys.set(keyId, key);
    
    // Persist key to secure storage
    await this.persistKey(key);

    console.log(`🔑 Generated new encryption key: ${keyId} (${type})`);
    return key;
  }

  /**
   * Encrypt data using specified key
   */
  async encrypt(
    data: string | Buffer,
    keyId: string,
    additionalData?: string
  ): Promise<EncryptionResult> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    if (!key.active) {
      throw new Error(`Encryption key is not active: ${keyId}`);
    }

    // Update key usage
    key.metadata.lastUsed = new Date();
    key.metadata.usageCount++;

    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    
    switch (key.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
        return this.encryptAES256GCM(dataBuffer, key, additionalData);
      case EncryptionAlgorithm.AES_256_CBC:
        return this.encryptAES256CBC(dataBuffer, key);
      case EncryptionAlgorithm.CHACHA20_POLY1305:
        return this.encryptChaCha20Poly1305(dataBuffer, key, additionalData);
      default:
        throw new Error(`Unsupported encryption algorithm: ${key.algorithm}`);
    }
  }

  /**
   * Decrypt data using specified key
   */
  async decrypt(encryptionResult: EncryptionResult): Promise<Buffer> {
    const key = this.keys.get(encryptionResult.keyId);
    if (!key) {
      throw new Error(`Decryption key not found: ${encryptionResult.keyId}`);
    }

    // Update key usage
    key.metadata.lastUsed = new Date();
    key.metadata.usageCount++;

    const encryptedData = Buffer.from(encryptionResult.encryptedData, 'base64');
    
    switch (encryptionResult.algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
        return this.decryptAES256GCM(encryptedData, key, encryptionResult);
      case EncryptionAlgorithm.AES_256_CBC:
        return this.decryptAES256CBC(encryptedData, key, encryptionResult);
      case EncryptionAlgorithm.CHACHA20_POLY1305:
        return this.decryptChaCha20Poly1305(encryptedData, key, encryptionResult);
      default:
        throw new Error(`Unsupported decryption algorithm: ${encryptionResult.algorithm}`);
    }
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(keyId: string): Promise<EncryptionKey> {
    const oldKey = this.keys.get(keyId);
    if (!oldKey) {
      throw new Error(`Key not found for rotation: ${keyId}`);
    }

    console.log(`🔄 Rotating encryption key: ${keyId}`);

    // Generate new key with incremented version
    const newKey: EncryptionKey = {
      ...oldKey,
      id: this.generateKeyId(oldKey.type),
      keyData: crypto.randomBytes(this.getKeySize(oldKey.algorithm)),
      version: oldKey.version + 1,
      createdAt: new Date(),
      expiresAt: oldKey.expiresAt ? new Date(Date.now() + (oldKey.expiresAt.getTime() - oldKey.createdAt.getTime())) : undefined,
      metadata: {
        ...oldKey.metadata,
        usageCount: 0,
        lastUsed: undefined
      }
    };

    // Deactivate old key but keep for decryption
    oldKey.active = false;

    // Store new key
    this.keys.set(newKey.id, newKey);
    await this.persistKey(newKey);

    // Update old key status
    await this.persistKey(oldKey);

    console.log(`✅ Key rotated: ${keyId} → ${newKey.id}`);
    return newKey;
  }

  /**
   * Get active key for a specific type
   */
  getActiveKey(type: KeyType): EncryptionKey | null {
    for (const key of this.keys.values()) {
      if (key.type === type && key.active) {
        return key;
      }
    }
    return null;
  }

  /**
   * Encrypt field data for database storage
   */
  async encryptDatabaseField(fieldValue: string, fieldName: string): Promise<string> {
    let key = this.getActiveKey(KeyType.DATABASE_FIELD);
    if (!key) {
      key = await this.generateKey(KeyType.DATABASE_FIELD, EncryptionAlgorithm.AES_256_GCM, 'Database field encryption');
    }

    const encryptionResult = await this.encrypt(fieldValue, key.id, fieldName);
    
    // Return compact format for database storage
    return JSON.stringify({
      d: encryptionResult.encryptedData,
      k: encryptionResult.keyId,
      v: encryptionResult.keyVersion,
      a: encryptionResult.algorithm,
      i: encryptionResult.iv,
      t: encryptionResult.authTag
    });
  }

  /**
   * Decrypt field data from database
   */
  async decryptDatabaseField(encryptedValue: string): Promise<string> {
    try {
      const parsed = JSON.parse(encryptedValue);
      
      const encryptionResult: EncryptionResult = {
        encryptedData: parsed.d,
        keyId: parsed.k,
        keyVersion: parsed.v,
        algorithm: parsed.a,
        iv: parsed.i,
        authTag: parsed.t,
        timestamp: new Date()
      };

      const decryptedBuffer = await this.decrypt(encryptionResult);
      return decryptedBuffer.toString('utf8');
    } catch (error) {
      console.error('Database field decryption failed:', error);
      throw new Error('Failed to decrypt database field');
    }
  }

  /**
   * Encrypt file data for storage
   */
  async encryptFileData(fileBuffer: Buffer, fileName: string): Promise<{
    encryptedData: Buffer;
    encryptionMetadata: string;
  }> {
    let key = this.getActiveKey(KeyType.FILE_STORAGE);
    if (!key) {
      key = await this.generateKey(KeyType.FILE_STORAGE, EncryptionAlgorithm.AES_256_GCM, 'File storage encryption');
    }

    const encryptionResult = await this.encrypt(fileBuffer, key.id, fileName);
    
    return {
      encryptedData: Buffer.from(encryptionResult.encryptedData, 'base64'),
      encryptionMetadata: JSON.stringify({
        keyId: encryptionResult.keyId,
        keyVersion: encryptionResult.keyVersion,
        algorithm: encryptionResult.algorithm,
        iv: encryptionResult.iv,
        authTag: encryptionResult.authTag,
        timestamp: encryptionResult.timestamp
      })
    };
  }

  /**
   * Decrypt file data from storage
   */
  async decryptFileData(encryptedData: Buffer, encryptionMetadata: string): Promise<Buffer> {
    const metadata = JSON.parse(encryptionMetadata);
    
    const encryptionResult: EncryptionResult = {
      encryptedData: encryptedData.toString('base64'),
      keyId: metadata.keyId,
      keyVersion: metadata.keyVersion,
      algorithm: metadata.algorithm,
      iv: metadata.iv,
      authTag: metadata.authTag,
      timestamp: new Date(metadata.timestamp)
    };

    return await this.decrypt(encryptionResult);
  }

  // Encryption algorithm implementations
  private async encryptAES256GCM(
    data: Buffer,
    key: EncryptionKey,
    additionalData?: string
  ): Promise<EncryptionResult> {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipherGCM('aes-256-gcm');
    
    cipher.setKey(key.keyData);
    cipher.setIV(iv);
    
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData, 'utf8'));
    }

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted.toString('base64'),
      keyId: key.id,
      keyVersion: key.version,
      algorithm: key.algorithm,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      timestamp: new Date()
    };
  }

  private async decryptAES256GCM(
    encryptedData: Buffer,
    key: EncryptionKey,
    encryptionResult: EncryptionResult
  ): Promise<Buffer> {
    if (!encryptionResult.iv || !encryptionResult.authTag) {
      throw new Error('IV and auth tag required for AES-256-GCM decryption');
    }

    const iv = Buffer.from(encryptionResult.iv, 'base64');
    const authTag = Buffer.from(encryptionResult.authTag, 'base64');
    
    const decipher = crypto.createDecipherGCM('aes-256-gcm');
    decipher.setKey(key.keyData);
    decipher.setIV(iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  private async encryptAES256CBC(data: Buffer, key: EncryptionKey): Promise<EncryptionResult> {
    const iv = crypto.randomBytes(16); // 128-bit IV for CBC
    const cipher = crypto.createCipher('aes-256-cbc', key.keyData);
    cipher.setIV(iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return {
      encryptedData: encrypted.toString('base64'),
      keyId: key.id,
      keyVersion: key.version,
      algorithm: key.algorithm,
      iv: iv.toString('base64'),
      timestamp: new Date()
    };
  }

  private async decryptAES256CBC(
    encryptedData: Buffer,
    key: EncryptionKey,
    encryptionResult: EncryptionResult
  ): Promise<Buffer> {
    if (!encryptionResult.iv) {
      throw new Error('IV required for AES-256-CBC decryption');
    }

    const iv = Buffer.from(encryptionResult.iv, 'base64');
    const decipher = crypto.createDecipher('aes-256-cbc', key.keyData);
    decipher.setIV(iv);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  private async encryptChaCha20Poly1305(
    data: Buffer,
    key: EncryptionKey,
    additionalData?: string
  ): Promise<EncryptionResult> {
    const iv = crypto.randomBytes(12); // 96-bit nonce for ChaCha20-Poly1305
    const cipher = crypto.createCipher('chacha20-poly1305', key.keyData);
    cipher.setIV(iv);
    
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData, 'utf8'));
    }

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = (cipher as any).getAuthTag(); // Type assertion for ChaCha20-Poly1305

    return {
      encryptedData: encrypted.toString('base64'),
      keyId: key.id,
      keyVersion: key.version,
      algorithm: key.algorithm,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      timestamp: new Date()
    };
  }

  private async decryptChaCha20Poly1305(
    encryptedData: Buffer,
    key: EncryptionKey,
    encryptionResult: EncryptionResult
  ): Promise<Buffer> {
    if (!encryptionResult.iv || !encryptionResult.authTag) {
      throw new Error('IV and auth tag required for ChaCha20-Poly1305 decryption');
    }

    const iv = Buffer.from(encryptionResult.iv, 'base64');
    const authTag = Buffer.from(encryptionResult.authTag, 'base64');
    
    const decipher = crypto.createDecipher('chacha20-poly1305', key.keyData);
    decipher.setIV(iv);
    (decipher as any).setAuthTag(authTag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  // Helper methods
  private getKeySize(algorithm: EncryptionAlgorithm): number {
    switch (algorithm) {
      case EncryptionAlgorithm.AES_256_GCM:
      case EncryptionAlgorithm.AES_256_CBC:
      case EncryptionAlgorithm.CHACHA20_POLY1305:
        return 32; // 256 bits
      default:
        return 32;
    }
  }

  private generateKeyId(type: KeyType): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `${type}_${timestamp}_${random}`;
  }

  private generateCronSchedule(intervalDays: number): string {
    // Generate cron expression for key rotation
    // Run at 2 AM every N days
    return `0 2 */${intervalDays} * *`;
  }

  private async persistKey(key: EncryptionKey): Promise<void> {
    // In production, this would store keys in a secure key management service
    // For now, we'll store in memory and log the action
    console.log(`💾 Persisting encryption key: ${key.id}`);
  }

  private loadEncryptionKeys(): void {
    // Load existing keys from secure storage
    console.log('📋 Loading encryption keys...');
  }

  private scheduleKeyRotationChecks(): void {
    // Schedule periodic checks for key rotation
    setInterval(() => {
      this.checkKeyRotations();
    }, 24 * 60 * 60 * 1000); // Check daily

    console.log('⏰ Scheduled key rotation checks');
  }

  private async checkKeyRotations(): Promise<void> {
    console.log('🔍 Checking for keys requiring rotation...');
    
    const now = new Date();
    
    for (const key of this.keys.values()) {
      if (!key.active) continue;
      
      const policy = this.rotationPolicies.get(key.type);
      if (!policy || !policy.autoRotation) continue;

      const keyAge = (now.getTime() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (keyAge >= policy.rotationInterval) {
        console.log(`🔄 Auto-rotating key: ${key.id} (${keyAge} days old)`);
        await this.rotateKey(key.id);
      } else if (keyAge >= policy.rotationInterval - policy.notificationThreshold) {
        console.log(`⚠️ Key approaching rotation: ${key.id} (${keyAge} days old)`);
      }
    }
  }

  /**
   * Generate encryption report
   */
  generateEncryptionReport(): {
    summary: {
      totalKeys: number;
      activeKeys: number;
      keysByType: Record<KeyType, number>;
      keysNearingRotation: number;
      expiredKeys: number;
    };
    keyDetails: Array<{
      id: string;
      type: KeyType;
      algorithm: EncryptionAlgorithm;
      version: number;
      age: number;
      usageCount: number;
      status: string;
    }>;
    rotationSchedule: Array<{
      keyId: string;
      type: KeyType;
      nextRotation: Date;
      daysUntilRotation: number;
    }>;
  } {
    const now = new Date();
    const keys = Array.from(this.keys.values());
    
    const keysByType = keys.reduce((acc, key) => {
      acc[key.type] = (acc[key.type] || 0) + 1;
      return acc;
    }, {} as Record<KeyType, number>);

    const keysNearingRotation = keys.filter(key => {
      if (!key.active) return false;
      const policy = this.rotationPolicies.get(key.type);
      if (!policy) return false;
      
      const keyAge = (now.getTime() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return keyAge >= policy.rotationInterval - policy.notificationThreshold;
    }).length;

    const expiredKeys = keys.filter(key => 
      key.expiresAt && key.expiresAt < now
    ).length;

    const keyDetails = keys.map(key => {
      const keyAge = (now.getTime() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      let status = 'active';
      
      if (!key.active) status = 'inactive';
      else if (key.expiresAt && key.expiresAt < now) status = 'expired';
      else if (keysNearingRotation > 0) status = 'rotation_pending';

      return {
        id: key.id,
        type: key.type,
        algorithm: key.algorithm,
        version: key.version,
        age: Math.round(keyAge * 10) / 10,
        usageCount: key.metadata.usageCount,
        status
      };
    });

    const rotationSchedule = keys
      .filter(key => key.active)
      .map(key => {
        const policy = this.rotationPolicies.get(key.type);
        if (!policy) return null;
        
        const keyAge = (now.getTime() - key.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const daysUntilRotation = policy.rotationInterval - keyAge;
        const nextRotation = new Date(key.createdAt.getTime() + policy.rotationInterval * 24 * 60 * 60 * 1000);

        return {
          keyId: key.id,
          type: key.type,
          nextRotation,
          daysUntilRotation: Math.round(daysUntilRotation * 10) / 10
        };
      })
      .filter(item => item !== null) as Array<{
        keyId: string;
        type: KeyType;
        nextRotation: Date;
        daysUntilRotation: number;
      }>;

    return {
      summary: {
        totalKeys: keys.length,
        activeKeys: keys.filter(k => k.active).length,
        keysByType,
        keysNearingRotation,
        expiredKeys
      },
      keyDetails,
      rotationSchedule
    };
  }
}

// Export singleton instance
export const encryptionManager = new EncryptionManager();

export default {
  EncryptionManager,
  encryptionManager,
  KeyType,
  EncryptionAlgorithm
};
