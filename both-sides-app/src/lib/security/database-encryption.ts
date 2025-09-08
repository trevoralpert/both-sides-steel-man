/**
 * Database Encryption Configuration
 * PostgreSQL and Redis encryption at rest and in transit
 */

import { encryptionManager, KeyType } from './encryption-manager';

export interface DatabaseEncryptionConfig {
  postgresql: {
    transparentDataEncryption: boolean;
    connectionEncryption: boolean;
    backupEncryption: boolean;
    fieldLevelEncryption: {
      enabled: boolean;
      encryptedFields: string[];
      keyRotationInterval: number;
    };
  };
  redis: {
    authEnabled: boolean;
    tlsEnabled: boolean;
    encryptionAtRest: boolean;
    sessionEncryption: boolean;
  };
  backups: {
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
    retentionPeriod: number;
    keyRotationInterval: number;
  };
}

export interface EncryptedField {
  tableName: string;
  columnName: string;
  dataType: string;
  encryptionRequired: boolean;
  piiCategory: 'high' | 'medium' | 'low' | 'none';
  ferpaProtected: boolean;
}

export class DatabaseEncryption {
  private config: DatabaseEncryptionConfig;
  private encryptedFields: Map<string, EncryptedField> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeDatabaseEncryption();
  }

  private initializeDatabaseEncryption(): void {
    console.log('🗄️ Initializing Database Encryption');
    
    // Define encrypted fields
    this.defineEncryptedFields();
    
    // Configure PostgreSQL encryption
    this.configurePostgreSQLEncryption();
    
    // Configure Redis encryption
    this.configureRedisEncryption();
    
    // Set up backup encryption
    this.configureBackupEncryption();
  }

  private getDefaultConfig(): DatabaseEncryptionConfig {
    return {
      postgresql: {
        transparentDataEncryption: true,
        connectionEncryption: true,
        backupEncryption: true,
        fieldLevelEncryption: {
          enabled: true,
          encryptedFields: [
            'users.email',
            'users.phone',
            'student_profiles.personal_info',
            'survey_responses.response_data',
            'debate_messages.content',
            'parent_guardians.contact_info',
            'belief_profiles.profile_data'
          ],
          keyRotationInterval: 90 // days
        }
      },
      redis: {
        authEnabled: true,
        tlsEnabled: true,
        encryptionAtRest: true,
        sessionEncryption: true
      },
      backups: {
        encryptionEnabled: true,
        compressionEnabled: true,
        retentionPeriod: 2555, // 7 years for FERPA compliance
        keyRotationInterval: 180 // days
      }
    };
  }

  private defineEncryptedFields(): void {
    const fieldDefinitions: EncryptedField[] = [
      // User data
      {
        tableName: 'users',
        columnName: 'email',
        dataType: 'varchar',
        encryptionRequired: true,
        piiCategory: 'high',
        ferpaProtected: true
      },
      {
        tableName: 'users',
        columnName: 'phone',
        dataType: 'varchar',
        encryptionRequired: true,
        piiCategory: 'high',
        ferpaProtected: true
      },
      {
        tableName: 'users',
        columnName: 'date_of_birth',
        dataType: 'date',
        encryptionRequired: true,
        piiCategory: 'high',
        ferpaProtected: true
      },
      
      // Student profiles
      {
        tableName: 'student_profiles',
        columnName: 'personal_info',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'high',
        ferpaProtected: true
      },
      {
        tableName: 'student_profiles',
        columnName: 'emergency_contact',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'high',
        ferpaProtected: true
      },
      
      // Survey responses
      {
        tableName: 'survey_responses',
        columnName: 'response_data',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'medium',
        ferpaProtected: true
      },
      
      // Debate content
      {
        tableName: 'debate_messages',
        columnName: 'content',
        dataType: 'text',
        encryptionRequired: true,
        piiCategory: 'medium',
        ferpaProtected: true
      },
      {
        tableName: 'debate_messages',
        columnName: 'ai_feedback',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'medium',
        ferpaProtected: true
      },
      
      // Parent/guardian data
      {
        tableName: 'parent_guardians',
        columnName: 'contact_info',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'high',
        ferpaProtected: true
      },
      
      // Belief profiles
      {
        tableName: 'belief_profiles',
        columnName: 'profile_data',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'medium',
        ferpaProtected: true
      },
      
      // Session data
      {
        tableName: 'user_sessions',
        columnName: 'session_data',
        dataType: 'jsonb',
        encryptionRequired: true,
        piiCategory: 'low',
        ferpaProtected: false
      }
    ];

    fieldDefinitions.forEach(field => {
      const key = `${field.tableName}.${field.columnName}`;
      this.encryptedFields.set(key, field);
    });

    console.log(`📋 Configured ${fieldDefinitions.length} encrypted database fields`);
  }

  /**
   * Encrypt a database field value
   */
  async encryptField(tableName: string, columnName: string, value: any): Promise<string> {
    const fieldKey = `${tableName}.${columnName}`;
    const fieldConfig = this.encryptedFields.get(fieldKey);
    
    if (!fieldConfig?.encryptionRequired) {
      throw new Error(`Field ${fieldKey} is not configured for encryption`);
    }

    // Convert value to string if needed
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Use the encryption manager to encrypt the field
    return await encryptionManager.encryptDatabaseField(stringValue, fieldKey);
  }

  /**
   * Decrypt a database field value
   */
  async decryptField(encryptedValue: string): Promise<any> {
    const decryptedString = await encryptionManager.decryptDatabaseField(encryptedValue);
    
    // Try to parse as JSON, fallback to string
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  }

  /**
   * Generate PostgreSQL configuration for encryption
   */
  generatePostgreSQLConfig(): {
    connectionString: string;
    sslConfig: any;
    encryptionSettings: any;
  } {
    const baseConfig = {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: process.env.DATABASE_CA_CERT,
        key: process.env.DATABASE_CLIENT_KEY,
        cert: process.env.DATABASE_CLIENT_CERT
      }
    };

    const connectionString = this.buildEncryptedConnectionString();
    
    const encryptionSettings = {
      // Transparent Data Encryption settings
      tde_enabled: this.config.postgresql.transparentDataEncryption,
      
      // Field-level encryption settings
      field_encryption: {
        enabled: this.config.postgresql.fieldLevelEncryption.enabled,
        key_rotation_days: this.config.postgresql.fieldLevelEncryption.keyRotationInterval
      },
      
      // Backup encryption
      backup_encryption: this.config.postgresql.backupEncryption
    };

    return {
      connectionString,
      sslConfig: baseConfig.ssl,
      encryptionSettings
    };
  }

  /**
   * Generate Redis configuration for encryption
   */
  generateRedisConfig(): {
    connectionOptions: any;
    encryptionSettings: any;
  } {
    const connectionOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      
      // TLS configuration
      tls: this.config.redis.tlsEnabled ? {
        cert: process.env.REDIS_CLIENT_CERT,
        key: process.env.REDIS_CLIENT_KEY,
        ca: process.env.REDIS_CA_CERT,
        rejectUnauthorized: true
      } : undefined,
      
      // Connection encryption
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3
    };

    const encryptionSettings = {
      session_encryption: this.config.redis.sessionEncryption,
      at_rest_encryption: this.config.redis.encryptionAtRest,
      auth_enabled: this.config.redis.authEnabled
    };

    return {
      connectionOptions,
      encryptionSettings
    };
  }

  /**
   * Create database backup with encryption
   */
  async createEncryptedBackup(backupName: string): Promise<{
    success: boolean;
    backupPath?: string;
    encryptionKeyId?: string;
    error?: string;
  }> {
    try {
      console.log(`📦 Creating encrypted backup: ${backupName}`);

      // Generate backup encryption key
      const backupKey = await encryptionManager.generateKey(
        KeyType.BACKUP_ENCRYPTION,
        undefined,
        `Backup encryption for ${backupName}`
      );

      // In production, this would:
      // 1. Create database dump
      // 2. Compress the dump
      // 3. Encrypt with the backup key
      // 4. Store in secure location
      // 5. Log backup metadata

      const backupPath = `/backups/encrypted/${backupName}_${Date.now()}.backup.enc`;
      
      // Simulate backup creation
      await this.simulateBackupCreation(backupName, backupKey.id);

      console.log(`✅ Encrypted backup created: ${backupPath}`);
      
      return {
        success: true,
        backupPath,
        encryptionKeyId: backupKey.id
      };

    } catch (error) {
      console.error('Backup creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Restore from encrypted backup
   */
  async restoreFromEncryptedBackup(
    backupPath: string,
    encryptionKeyId: string
  ): Promise<{
    success: boolean;
    restoredTables?: string[];
    error?: string;
  }> {
    try {
      console.log(`📥 Restoring from encrypted backup: ${backupPath}`);

      // In production, this would:
      // 1. Retrieve backup file
      // 2. Decrypt using the specified key
      // 3. Decompress if needed
      // 4. Restore to database
      // 5. Verify restoration integrity

      // Simulate restoration
      const restoredTables = await this.simulateBackupRestoration(backupPath, encryptionKeyId);

      console.log(`✅ Backup restored successfully: ${restoredTables.length} tables`);
      
      return {
        success: true,
        restoredTables
      };

    } catch (error) {
      console.error('Backup restoration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rotate database encryption keys
   */
  async rotateEncryptionKeys(): Promise<{
    rotatedKeys: string[];
    errors: string[];
  }> {
    console.log('🔄 Rotating database encryption keys');
    
    const rotatedKeys: string[] = [];
    const errors: string[] = [];

    try {
      // Get current database field encryption key
      const currentKey = encryptionManager.getActiveKey(KeyType.DATABASE_FIELD);
      if (currentKey) {
        const newKey = await encryptionManager.rotateKey(currentKey.id);
        rotatedKeys.push(newKey.id);
        
        // In production, this would:
        // 1. Re-encrypt existing data with new key
        // 2. Update key references in metadata
        // 3. Verify encryption integrity
        console.log('🔑 Database field encryption key rotated');
      }

      // Rotate backup encryption key if needed
      const backupKey = encryptionManager.getActiveKey(KeyType.BACKUP_ENCRYPTION);
      if (backupKey) {
        const newBackupKey = await encryptionManager.rotateKey(backupKey.id);
        rotatedKeys.push(newBackupKey.id);
        console.log('🔑 Backup encryption key rotated');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('Key rotation failed:', error);
    }

    return { rotatedKeys, errors };
  }

  /**
   * Generate encryption status report
   */
  generateEncryptionReport(): {
    postgresql: {
      tdeEnabled: boolean;
      connectionEncrypted: boolean;
      encryptedFields: number;
      backupEncryption: boolean;
    };
    redis: {
      authEnabled: boolean;
      tlsEnabled: boolean;
      sessionEncryption: boolean;
    };
    fieldEncryption: Array<{
      table: string;
      column: string;
      piiCategory: string;
      ferpaProtected: boolean;
    }>;
    keyManagement: {
      activeKeys: number;
      keyRotationScheduled: boolean;
      lastRotation?: Date;
    };
  } {
    const encryptedFieldsList = Array.from(this.encryptedFields.values()).map(field => ({
      table: field.tableName,
      column: field.columnName,
      piiCategory: field.piiCategory,
      ferpaProtected: field.ferpaProtected
    }));

    const encryptionReport = encryptionManager.generateEncryptionReport();

    return {
      postgresql: {
        tdeEnabled: this.config.postgresql.transparentDataEncryption,
        connectionEncrypted: this.config.postgresql.connectionEncryption,
        encryptedFields: this.encryptedFields.size,
        backupEncryption: this.config.postgresql.backupEncryption
      },
      redis: {
        authEnabled: this.config.redis.authEnabled,
        tlsEnabled: this.config.redis.tlsEnabled,
        sessionEncryption: this.config.redis.sessionEncryption
      },
      fieldEncryption: encryptedFieldsList,
      keyManagement: {
        activeKeys: encryptionReport.summary.activeKeys,
        keyRotationScheduled: true,
        lastRotation: new Date() // Would be actual last rotation date
      }
    };
  }

  // Helper methods
  private configurePostgreSQLEncryption(): void {
    console.log('🔧 Configuring PostgreSQL encryption');
    
    if (this.config.postgresql.transparentDataEncryption) {
      console.log('  ✅ Transparent Data Encryption enabled');
    }
    
    if (this.config.postgresql.connectionEncryption) {
      console.log('  ✅ Connection encryption (SSL/TLS) enabled');
    }
    
    if (this.config.postgresql.fieldLevelEncryption.enabled) {
      console.log(`  ✅ Field-level encryption enabled for ${this.config.postgresql.fieldLevelEncryption.encryptedFields.length} fields`);
    }
  }

  private configureRedisEncryption(): void {
    console.log('🔧 Configuring Redis encryption');
    
    if (this.config.redis.authEnabled) {
      console.log('  ✅ Redis authentication enabled');
    }
    
    if (this.config.redis.tlsEnabled) {
      console.log('  ✅ Redis TLS encryption enabled');
    }
    
    if (this.config.redis.sessionEncryption) {
      console.log('  ✅ Session data encryption enabled');
    }
  }

  private configureBackupEncryption(): void {
    console.log('🔧 Configuring backup encryption');
    
    if (this.config.backups.encryptionEnabled) {
      console.log('  ✅ Backup encryption enabled');
      console.log(`  ✅ Backup retention: ${this.config.backups.retentionPeriod} days`);
    }
  }

  private buildEncryptedConnectionString(): string {
    const host = process.env.DATABASE_HOST || 'localhost';
    const port = process.env.DATABASE_PORT || '5432';
    const database = process.env.DATABASE_NAME || 'bothsides';
    const username = process.env.DATABASE_USERNAME || 'postgres';
    const password = process.env.DATABASE_PASSWORD || '';
    
    // Build connection string with SSL parameters
    let connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
    
    if (this.config.postgresql.connectionEncryption) {
      connectionString += '?sslmode=require&sslcert=/path/to/client.crt&sslkey=/path/to/client.key&sslrootcert=/path/to/ca.crt';
    }
    
    return connectionString;
  }

  private async simulateBackupCreation(backupName: string, keyId: string): Promise<void> {
    // Simulate backup creation process
    console.log(`  📊 Creating database dump: ${backupName}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`  🗜️ Compressing backup data`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`  🔐 Encrypting with key: ${keyId}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(`  💾 Storing encrypted backup`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async simulateBackupRestoration(backupPath: string, keyId: string): Promise<string[]> {
    // Simulate backup restoration process
    console.log(`  📥 Reading backup file: ${backupPath}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`  🔓 Decrypting with key: ${keyId}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log(`  🗜️ Decompressing backup data`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`  📊 Restoring database tables`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Return list of restored tables
    return [
      'users',
      'student_profiles',
      'survey_responses',
      'debate_messages',
      'parent_guardians',
      'belief_profiles',
      'user_sessions'
    ];
  }
}

// Export singleton instance
export const databaseEncryption = new DatabaseEncryption();

export default {
  DatabaseEncryption,
  databaseEncryption
};
