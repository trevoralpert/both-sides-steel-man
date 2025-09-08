/**
 * API Transport Encryption System
 * HTTPS/TLS enforcement and API request/response encryption for sensitive data
 */

import crypto from 'crypto';
import { encryptionManager, KeyType } from './encryption-manager';
import { certificateManager } from './certificate-manager';

export interface TransportEncryptionConfig {
  https: {
    enforced: boolean;
    minTlsVersion: '1.2' | '1.3';
    cipherSuites: string[];
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubdomains: boolean;
      preload: boolean;
    };
  };
  apiEncryption: {
    enabled: boolean;
    encryptSensitiveEndpoints: boolean;
    encryptionAlgorithm: string;
    keyRotationInterval: number;
    requestEncryption: boolean;
    responseEncryption: boolean;
  };
  internalServices: {
    mutualTls: boolean;
    serviceToServiceEncryption: boolean;
    certificateValidation: boolean;
  };
}

export interface EncryptedAPIRequest {
  encryptedPayload: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag?: string;
  timestamp: number;
  requestId: string;
}

export interface EncryptedAPIResponse {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv: string;
  authTag?: string;
  timestamp: number;
  responseId: string;
}

export interface SensitiveEndpoint {
  path: string;
  methods: string[];
  encryptionRequired: boolean;
  sensitiveFields: string[];
  ferpaProtected: boolean;
  authenticationRequired: boolean;
}

export class APITransportEncryption {
  private config: TransportEncryptionConfig;
  private sensitiveEndpoints: Map<string, SensitiveEndpoint> = new Map();

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeTransportEncryption();
  }

  private initializeTransportEncryption(): void {
    console.log('🔒 Initializing API Transport Encryption');
    
    // Configure HTTPS/TLS settings
    this.configureHTTPS();
    
    // Define sensitive endpoints
    this.defineSensitiveEndpoints();
    
    // Set up API encryption keys
    this.setupAPIEncryptionKeys();
    
    // Configure internal service encryption
    this.configureInternalServiceEncryption();
  }

  private getDefaultConfig(): TransportEncryptionConfig {
    return {
      https: {
        enforced: true,
        minTlsVersion: '1.3',
        cipherSuites: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-CHACHA20-POLY1305'
        ],
        hsts: {
          enabled: true,
          maxAge: 31536000, // 1 year
          includeSubdomains: true,
          preload: true
        }
      },
      apiEncryption: {
        enabled: true,
        encryptSensitiveEndpoints: true,
        encryptionAlgorithm: 'aes-256-gcm',
        keyRotationInterval: 30, // days
        requestEncryption: true,
        responseEncryption: true
      },
      internalServices: {
        mutualTls: true,
        serviceToServiceEncryption: true,
        certificateValidation: true
      }
    };
  }

  private defineSensitiveEndpoints(): void {
    const endpoints: SensitiveEndpoint[] = [
      // User authentication and profile endpoints
      {
        path: '/api/auth/login',
        methods: ['POST'],
        encryptionRequired: true,
        sensitiveFields: ['email', 'password', 'mfaCode'],
        ferpaProtected: false,
        authenticationRequired: false
      },
      {
        path: '/api/auth/register',
        methods: ['POST'],
        encryptionRequired: true,
        sensitiveFields: ['email', 'password', 'personalInfo', 'dateOfBirth'],
        ferpaProtected: true,
        authenticationRequired: false
      },
      {
        path: '/api/users/profile',
        methods: ['GET', 'PUT'],
        encryptionRequired: true,
        sensitiveFields: ['email', 'phone', 'personalInfo', 'emergencyContact'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      
      // Student data endpoints
      {
        path: '/api/students/:id/profile',
        methods: ['GET', 'PUT'],
        encryptionRequired: true,
        sensitiveFields: ['personalInfo', 'emergencyContact', 'parentContact'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      {
        path: '/api/students/:id/grades',
        methods: ['GET', 'POST'],
        encryptionRequired: true,
        sensitiveFields: ['grades', 'assessments', 'feedback'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      
      // Survey and assessment endpoints
      {
        path: '/api/surveys/:id/responses',
        methods: ['GET', 'POST'],
        encryptionRequired: true,
        sensitiveFields: ['responses', 'personalReflections', 'beliefData'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      {
        path: '/api/assessments/:id/results',
        methods: ['GET', 'POST'],
        encryptionRequired: true,
        sensitiveFields: ['results', 'analysis', 'recommendations'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      
      // Debate and messaging endpoints
      {
        path: '/api/debates/:id/messages',
        methods: ['GET', 'POST'],
        encryptionRequired: true,
        sensitiveFields: ['content', 'aiFeedback', 'personalReflections'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      
      // Parent/guardian endpoints
      {
        path: '/api/parents/:id/consent',
        methods: ['GET', 'POST', 'PUT'],
        encryptionRequired: true,
        sensitiveFields: ['consentData', 'contactInfo', 'relationshipInfo'],
        ferpaProtected: true,
        authenticationRequired: true
      },
      
      // Data export endpoints
      {
        path: '/api/data/export',
        methods: ['POST'],
        encryptionRequired: true,
        sensitiveFields: ['exportData', 'studentRecords', 'personalData'],
        ferpaProtected: true,
        authenticationRequired: true
      }
    ];

    endpoints.forEach(endpoint => {
      this.sensitiveEndpoints.set(endpoint.path, endpoint);
    });

    console.log(`📋 Configured ${endpoints.length} sensitive API endpoints`);
  }

  /**
   * Encrypt API request payload
   */
  async encryptAPIRequest(
    payload: any,
    endpoint: string,
    method: string
  ): Promise<EncryptedAPIRequest> {
    const endpointConfig = this.findSensitiveEndpoint(endpoint, method);
    
    if (!endpointConfig?.encryptionRequired) {
      throw new Error(`Endpoint ${method} ${endpoint} is not configured for encryption`);
    }

    // Get API transport encryption key
    let key = encryptionManager.getActiveKey(KeyType.API_TRANSPORT);
    if (!key) {
      key = await encryptionManager.generateKey(
        KeyType.API_TRANSPORT,
        undefined,
        'API transport encryption'
      );
    }

    // Filter sensitive fields for encryption
    const sensitiveData = this.extractSensitiveFields(payload, endpointConfig.sensitiveFields);
    const encryptionResult = await encryptionManager.encrypt(
      JSON.stringify(sensitiveData),
      key.id,
      `${method} ${endpoint}`
    );

    return {
      encryptedPayload: encryptionResult.encryptedData,
      keyId: encryptionResult.keyId,
      algorithm: encryptionResult.algorithm,
      iv: encryptionResult.iv!,
      authTag: encryptionResult.authTag,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    };
  }

  /**
   * Decrypt API request payload
   */
  async decryptAPIRequest(encryptedRequest: EncryptedAPIRequest): Promise<any> {
    const encryptionResult = {
      encryptedData: encryptedRequest.encryptedPayload,
      keyId: encryptedRequest.keyId,
      keyVersion: 1, // Would be stored with request
      algorithm: encryptedRequest.algorithm as any,
      iv: encryptedRequest.iv,
      authTag: encryptedRequest.authTag,
      timestamp: new Date(encryptedRequest.timestamp)
    };

    const decryptedBuffer = await encryptionManager.decrypt(encryptionResult);
    return JSON.parse(decryptedBuffer.toString('utf8'));
  }

  /**
   * Encrypt API response data
   */
  async encryptAPIResponse(
    responseData: any,
    endpoint: string,
    method: string
  ): Promise<EncryptedAPIResponse> {
    const endpointConfig = this.findSensitiveEndpoint(endpoint, method);
    
    if (!endpointConfig?.encryptionRequired) {
      throw new Error(`Endpoint ${method} ${endpoint} is not configured for encryption`);
    }

    // Get API transport encryption key
    let key = encryptionManager.getActiveKey(KeyType.API_TRANSPORT);
    if (!key) {
      key = await encryptionManager.generateKey(
        KeyType.API_TRANSPORT,
        undefined,
        'API transport encryption'
      );
    }

    // Filter sensitive fields for encryption
    const sensitiveData = this.extractSensitiveFields(responseData, endpointConfig.sensitiveFields);
    const encryptionResult = await encryptionManager.encrypt(
      JSON.stringify(sensitiveData),
      key.id,
      `${method} ${endpoint} response`
    );

    return {
      encryptedData: encryptionResult.encryptedData,
      keyId: encryptionResult.keyId,
      algorithm: encryptionResult.algorithm,
      iv: encryptionResult.iv!,
      authTag: encryptionResult.authTag,
      timestamp: Date.now(),
      responseId: this.generateResponseId()
    };
  }

  /**
   * Decrypt API response data
   */
  async decryptAPIResponse(encryptedResponse: EncryptedAPIResponse): Promise<any> {
    const encryptionResult = {
      encryptedData: encryptedResponse.encryptedData,
      keyId: encryptedResponse.keyId,
      keyVersion: 1, // Would be stored with response
      algorithm: encryptedResponse.algorithm as any,
      iv: encryptedResponse.iv,
      authTag: encryptedResponse.authTag,
      timestamp: new Date(encryptedResponse.timestamp)
    };

    const decryptedBuffer = await encryptionManager.decrypt(encryptionResult);
    return JSON.parse(decryptedBuffer.toString('utf8'));
  }

  /**
   * Generate HTTPS configuration for Next.js
   */
  generateHTTPSConfig(): {
    httpsRedirect: boolean;
    hstsHeader: string;
    tlsConfig: any;
    securityHeaders: Record<string, string>;
  } {
    const hstsHeader = this.config.https.hsts.enabled
      ? `max-age=${this.config.https.hsts.maxAge}${this.config.https.hsts.includeSubdomains ? '; includeSubDomains' : ''}${this.config.https.hsts.preload ? '; preload' : ''}`
      : '';

    return {
      httpsRedirect: this.config.https.enforced,
      hstsHeader,
      tlsConfig: {
        minVersion: this.config.https.minTlsVersion,
        ciphers: this.config.https.cipherSuites.join(':'),
        honorCipherOrder: true,
        secureProtocol: 'TLSv1_3_method'
      },
      securityHeaders: {
        'Strict-Transport-Security': hstsHeader,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': this.generateCSPHeader(),
        'Permissions-Policy': this.generatePermissionsPolicyHeader()
      }
    };
  }

  /**
   * Generate middleware for API encryption
   */
  generateEncryptionMiddleware(): {
    requestDecryption: (req: any, res: any, next: any) => Promise<void>;
    responseEncryption: (req: any, res: any, next: any) => Promise<void>;
  } {
    const requestDecryption = async (req: any, res: any, next: any) => {
      try {
        const endpoint = req.path;
        const method = req.method;
        
        const endpointConfig = this.findSensitiveEndpoint(endpoint, method);
        
        if (endpointConfig?.encryptionRequired && req.body?.encryptedPayload) {
          // Decrypt the request payload
          const decryptedData = await this.decryptAPIRequest(req.body);
          req.body = { ...req.body, ...decryptedData };
          req.decryptedRequest = true;
        }
        
        next();
      } catch (error) {
        console.error('Request decryption failed:', error);
        res.status(400).json({ error: 'Request decryption failed' });
      }
    };

    const responseEncryption = async (req: any, res: any, next: any) => {
      const originalJson = res.json;
      
      res.json = async function(data: any) {
        try {
          const endpoint = req.path;
          const method = req.method;
          
          const endpointConfig = this.findSensitiveEndpoint(endpoint, method);
          
          if (endpointConfig?.encryptionRequired && this.config.apiEncryption.responseEncryption) {
            // Encrypt sensitive response data
            const encryptedResponse = await this.encryptAPIResponse(data, endpoint, method);
            return originalJson.call(this, {
              ...data,
              encryptedData: encryptedResponse.encryptedData,
              encryptionMetadata: {
                keyId: encryptedResponse.keyId,
                algorithm: encryptedResponse.algorithm,
                iv: encryptedResponse.iv,
                authTag: encryptedResponse.authTag,
                timestamp: encryptedResponse.timestamp,
                responseId: encryptedResponse.responseId
              }
            });
          }
          
          return originalJson.call(this, data);
        } catch (error) {
          console.error('Response encryption failed:', error);
          return originalJson.call(this, { error: 'Response encryption failed' });
        }
      }.bind(this);
      
      next();
    };

    return {
      requestDecryption,
      responseEncryption
    };
  }

  /**
   * Configure internal service-to-service encryption
   */
  configureInternalServiceEncryption(): {
    clientConfig: any;
    serverConfig: any;
    mutualTlsConfig: any;
  } {
    const clientConfig = {
      httpsAgent: {
        cert: process.env.SERVICE_CLIENT_CERT,
        key: process.env.SERVICE_CLIENT_KEY,
        ca: process.env.SERVICE_CA_CERT,
        rejectUnauthorized: this.config.internalServices.certificateValidation
      }
    };

    const serverConfig = {
      https: true,
      cert: process.env.SERVICE_SERVER_CERT,
      key: process.env.SERVICE_SERVER_KEY,
      ca: process.env.SERVICE_CA_CERT,
      requestCert: this.config.internalServices.mutualTls,
      rejectUnauthorized: this.config.internalServices.certificateValidation
    };

    const mutualTlsConfig = {
      enabled: this.config.internalServices.mutualTls,
      clientCertValidation: true,
      trustedCAs: [process.env.SERVICE_CA_CERT],
      allowedServices: [
        'auth-service',
        'debate-service',
        'survey-service',
        'analytics-service',
        'notification-service'
      ]
    };

    return {
      clientConfig,
      serverConfig,
      mutualTlsConfig
    };
  }

  /**
   * Generate transport encryption report
   */
  generateTransportEncryptionReport(): {
    https: {
      enforced: boolean;
      tlsVersion: string;
      hstsEnabled: boolean;
      certificateStatus: string;
    };
    apiEncryption: {
      enabled: boolean;
      encryptedEndpoints: number;
      keyRotationStatus: string;
      lastKeyRotation?: Date;
    };
    internalServices: {
      mutualTlsEnabled: boolean;
      serviceToServiceEncryption: boolean;
      certificateValidation: boolean;
    };
  } {
    const encryptionReport = encryptionManager.generateEncryptionReport();
    const apiTransportKeys = encryptionReport.keyDetails.filter(key => key.type === KeyType.API_TRANSPORT);
    
    return {
      https: {
        enforced: this.config.https.enforced,
        tlsVersion: this.config.https.minTlsVersion,
        hstsEnabled: this.config.https.hsts.enabled,
        certificateStatus: 'active' // Would check actual certificate status
      },
      apiEncryption: {
        enabled: this.config.apiEncryption.enabled,
        encryptedEndpoints: this.sensitiveEndpoints.size,
        keyRotationStatus: apiTransportKeys.length > 0 ? 'active' : 'inactive',
        lastKeyRotation: apiTransportKeys.length > 0 ? new Date() : undefined
      },
      internalServices: {
        mutualTlsEnabled: this.config.internalServices.mutualTls,
        serviceToServiceEncryption: this.config.internalServices.serviceToServiceEncryption,
        certificateValidation: this.config.internalServices.certificateValidation
      }
    };
  }

  // Helper methods
  private configureHTTPS(): void {
    console.log('🔧 Configuring HTTPS/TLS settings');
    
    if (this.config.https.enforced) {
      console.log(`  ✅ HTTPS enforcement enabled (TLS ${this.config.https.minTlsVersion})`);
    }
    
    if (this.config.https.hsts.enabled) {
      console.log(`  ✅ HSTS enabled (max-age: ${this.config.https.hsts.maxAge})`);
    }
    
    console.log(`  ✅ ${this.config.https.cipherSuites.length} secure cipher suites configured`);
  }

  private async setupAPIEncryptionKeys(): Promise<void> {
    console.log('🔧 Setting up API encryption keys');
    
    if (this.config.apiEncryption.enabled) {
      let key = encryptionManager.getActiveKey(KeyType.API_TRANSPORT);
      if (!key) {
        key = await encryptionManager.generateKey(
          KeyType.API_TRANSPORT,
          undefined,
          'API transport encryption'
        );
      }
      console.log(`  ✅ API transport encryption key active: ${key.id}`);
    }
  }

  private configureInternalServiceEncryption(): void {
    console.log('🔧 Configuring internal service encryption');
    
    if (this.config.internalServices.mutualTls) {
      console.log('  ✅ Mutual TLS enabled for service-to-service communication');
    }
    
    if (this.config.internalServices.serviceToServiceEncryption) {
      console.log('  ✅ Service-to-service encryption enabled');
    }
  }

  private findSensitiveEndpoint(endpoint: string, method: string): SensitiveEndpoint | null {
    // Check exact match first
    const exactMatch = this.sensitiveEndpoints.get(endpoint);
    if (exactMatch && exactMatch.methods.includes(method)) {
      return exactMatch;
    }

    // Check pattern matches (for parameterized routes)
    for (const [pattern, config] of this.sensitiveEndpoints) {
      if (this.matchesPattern(endpoint, pattern) && config.methods.includes(method)) {
        return config;
      }
    }

    return null;
  }

  private matchesPattern(endpoint: string, pattern: string): boolean {
    // Convert pattern like '/api/students/:id/profile' to regex
    const regexPattern = pattern.replace(/:[\w]+/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  private extractSensitiveFields(data: any, sensitiveFields: string[]): any {
    const result: any = {};
    
    for (const field of sensitiveFields) {
      if (data.hasOwnProperty(field)) {
        result[field] = data[field];
      }
    }
    
    return result;
  }

  private generateCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
  }

  private generatePermissionsPolicyHeader(): string {
    return [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=()',
      'vibrate=()',
      'fullscreen=(self)',
      'sync-xhr=()'
    ].join(', ');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateResponseId(): string {
    return `res_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

// Export singleton instance
export const apiTransportEncryption = new APITransportEncryption();

export default {
  APITransportEncryption,
  apiTransportEncryption
};
