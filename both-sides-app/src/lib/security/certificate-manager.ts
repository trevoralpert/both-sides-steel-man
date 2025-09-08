/**
 * Certificate Management System
 * Handles SSL/TLS certificates, automatic renewal, and certificate lifecycle
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface Certificate {
  id: string;
  commonName: string;
  subjectAltNames: string[];
  issuer: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  fingerprint: string;
  publicKey: string;
  privateKey?: string; // Only stored for owned certificates
  certificateChain: string[];
  status: 'active' | 'expiring' | 'expired' | 'revoked' | 'pending';
  autoRenew: boolean;
  renewalThreshold: number; // days before expiration to renew
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    environment: string;
    purpose: string;
    provider: string;
    lastRenewal?: Date;
    renewalAttempts: number;
    validationMethod: 'dns' | 'http' | 'tls-alpn';
  };
}

export interface CertificateRequest {
  id: string;
  commonName: string;
  subjectAltNames: string[];
  keySize: number;
  algorithm: 'rsa' | 'ecdsa';
  country?: string;
  state?: string;
  city?: string;
  organization?: string;
  organizationalUnit?: string;
  email?: string;
  validityPeriod: number; // days
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  csr: string; // Certificate Signing Request
  privateKey: string;
  createdAt: Date;
  approvedAt?: Date;
  issuedAt?: Date;
}

export interface CertificateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  expiresIn: number; // days
  chainValid: boolean;
  revocationStatus: 'good' | 'revoked' | 'unknown';
  details: {
    commonNameMatch: boolean;
    sanMatch: boolean;
    keyUsageValid: boolean;
    extendedKeyUsageValid: boolean;
    basicConstraintsValid: boolean;
  };
}

export class CertificateManager {
  private certificates: Map<string, Certificate> = new Map();
  private certificateRequests: Map<string, CertificateRequest> = new Map();
  private certStorePath: string;

  constructor(certStorePath: string = './certs') {
    this.certStorePath = certStorePath;
    this.initializeCertificateManager();
  }

  private async initializeCertificateManager(): Promise<void> {
    console.log('🔐 Initializing Certificate Manager');
    
    // Ensure certificate store directory exists
    await this.ensureCertStoreExists();
    
    // Load existing certificates
    await this.loadCertificates();
    
    // Schedule certificate monitoring
    this.scheduleCertificateMonitoring();
    
    // Check for expiring certificates
    await this.checkExpiringCertificates();
  }

  private async ensureCertStoreExists(): Promise<void> {
    try {
      await fs.mkdir(this.certStorePath, { recursive: true });
      console.log(`📁 Certificate store initialized: ${this.certStorePath}`);
    } catch (error) {
      console.error('Failed to create certificate store:', error);
      throw error;
    }
  }

  /**
   * Generate a new certificate request (CSR)
   */
  async generateCertificateRequest(
    commonName: string,
    subjectAltNames: string[] = [],
    options: {
      keySize?: number;
      algorithm?: 'rsa' | 'ecdsa';
      country?: string;
      state?: string;
      city?: string;
      organization?: string;
      organizationalUnit?: string;
      email?: string;
      validityPeriod?: number;
    } = {}
  ): Promise<CertificateRequest> {
    const requestId = this.generateId('csr');
    
    const {
      keySize = 2048,
      algorithm = 'rsa',
      country = 'US',
      state = 'CA',
      city = 'San Francisco',
      organization = 'Both Sides, Inc.',
      organizationalUnit = 'IT Department',
      email = 'admin@bothsides.app',
      validityPeriod = 365
    } = options;

    console.log(`📝 Generating certificate request for ${commonName}`);

    // Generate key pair
    const { publicKey, privateKey } = await this.generateKeyPair(algorithm, keySize);
    
    // Create certificate signing request
    const csr = await this.createCSR({
      commonName,
      subjectAltNames,
      country,
      state,
      city,
      organization,
      organizationalUnit,
      email,
      publicKey
    });

    const request: CertificateRequest = {
      id: requestId,
      commonName,
      subjectAltNames,
      keySize,
      algorithm,
      country,
      state,
      city,
      organization,
      organizationalUnit,
      email,
      validityPeriod,
      status: 'pending',
      csr,
      privateKey,
      createdAt: new Date()
    };

    this.certificateRequests.set(requestId, request);
    
    // Save CSR to file
    await this.saveCSRToFile(request);

    return request;
  }

  /**
   * Install a certificate from a certificate authority
   */
  async installCertificate(
    certificatePem: string,
    chainPem: string[],
    privateKeyPem?: string,
    options: {
      autoRenew?: boolean;
      renewalThreshold?: number;
      environment?: string;
      purpose?: string;
      provider?: string;
      validationMethod?: 'dns' | 'http' | 'tls-alpn';
    } = {}
  ): Promise<Certificate> {
    console.log('📦 Installing new certificate');

    const {
      autoRenew = true,
      renewalThreshold = 30,
      environment = process.env.NODE_ENV || 'development',
      purpose = 'HTTPS/TLS',
      provider = 'manual',
      validationMethod = 'http'
    } = options;

    // Parse certificate
    const certInfo = await this.parseCertificate(certificatePem);
    const certificateId = this.generateId('cert');

    const certificate: Certificate = {
      id: certificateId,
      commonName: certInfo.subject.commonName,
      subjectAltNames: certInfo.subjectAltNames,
      issuer: certInfo.issuer.organization || certInfo.issuer.commonName,
      serialNumber: certInfo.serialNumber,
      notBefore: certInfo.notBefore,
      notAfter: certInfo.notAfter,
      fingerprint: certInfo.fingerprint,
      publicKey: certificatePem,
      privateKey: privateKeyPem,
      certificateChain: chainPem,
      status: this.getCertificateStatus(certInfo.notAfter),
      autoRenew,
      renewalThreshold,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        environment,
        purpose,
        provider,
        renewalAttempts: 0,
        validationMethod
      }
    };

    this.certificates.set(certificateId, certificate);

    // Save certificate files
    await this.saveCertificateFiles(certificate);

    console.log(`✅ Certificate installed: ${certificate.commonName} (expires: ${certificate.notAfter.toLocaleDateString()})`);
    return certificate;
  }

  /**
   * Validate a certificate
   */
  async validateCertificate(certificateId: string): Promise<CertificateValidationResult> {
    const certificate = this.certificates.get(certificateId);
    if (!certificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    const now = new Date();
    const expiresIn = Math.ceil((certificate.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check expiration
    if (certificate.notAfter < now) {
      errors.push('Certificate has expired');
    } else if (expiresIn <= certificate.renewalThreshold) {
      warnings.push(`Certificate expires in ${expiresIn} days`);
    }

    // Check not before date
    if (certificate.notBefore > now) {
      errors.push('Certificate is not yet valid');
    }

    // Validate certificate chain
    const chainValid = await this.validateCertificateChain(certificate);
    if (!chainValid) {
      errors.push('Certificate chain validation failed');
    }

    // Check revocation status (simplified)
    const revocationStatus = await this.checkRevocationStatus(certificate);

    // Validate certificate properties
    const details = await this.validateCertificateDetails(certificate);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      expiresIn,
      chainValid,
      revocationStatus,
      details
    };
  }

  /**
   * Renew a certificate
   */
  async renewCertificate(certificateId: string): Promise<Certificate> {
    const certificate = this.certificates.get(certificateId);
    if (!certificate) {
      throw new Error(`Certificate not found: ${certificateId}`);
    }

    console.log(`🔄 Renewing certificate: ${certificate.commonName}`);

    certificate.metadata.renewalAttempts++;

    try {
      // Generate new CSR with same parameters
      const request = await this.generateCertificateRequest(
        certificate.commonName,
        certificate.subjectAltNames,
        {
          keySize: 2048,
          algorithm: 'rsa',
          validityPeriod: 365
        }
      );

      // In production, this would submit to CA for renewal
      // For demo, we'll simulate successful renewal
      const renewedCert = await this.simulateCertificateRenewal(certificate, request);

      // Update certificate
      Object.assign(certificate, renewedCert, {
        metadata: {
          ...certificate.metadata,
          lastRenewal: new Date(),
          renewalAttempts: 0
        },
        updatedAt: new Date()
      });

      await this.saveCertificateFiles(certificate);

      console.log(`✅ Certificate renewed: ${certificate.commonName}`);
      return certificate;

    } catch (error) {
      console.error(`❌ Certificate renewal failed: ${certificate.commonName}`, error);
      throw error;
    }
  }

  /**
   * Get certificate by common name
   */
  getCertificateByCommonName(commonName: string): Certificate | null {
    for (const cert of this.certificates.values()) {
      if (cert.commonName === commonName || cert.subjectAltNames.includes(commonName)) {
        return cert;
      }
    }
    return null;
  }

  /**
   * List all certificates
   */
  listCertificates(filter?: {
    status?: Certificate['status'];
    environment?: string;
    expiringWithin?: number; // days
  }): Certificate[] {
    let certificates = Array.from(this.certificates.values());

    if (filter) {
      if (filter.status) {
        certificates = certificates.filter(cert => cert.status === filter.status);
      }

      if (filter.environment) {
        certificates = certificates.filter(cert => cert.metadata.environment === filter.environment);
      }

      if (filter.expiringWithin) {
        const threshold = new Date(Date.now() + filter.expiringWithin * 24 * 60 * 60 * 1000);
        certificates = certificates.filter(cert => cert.notAfter <= threshold);
      }
    }

    return certificates;
  }

  /**
   * Generate certificate report
   */
  generateCertificateReport(): {
    summary: {
      totalCertificates: number;
      activeCertificates: number;
      expiringCertificates: number;
      expiredCertificates: number;
      autoRenewEnabled: number;
    };
    certificates: Array<{
      id: string;
      commonName: string;
      issuer: string;
      status: string;
      expiresIn: number;
      autoRenew: boolean;
      lastRenewal?: Date;
    }>;
    upcomingRenewals: Array<{
      certificateId: string;
      commonName: string;
      renewalDate: Date;
      daysUntilRenewal: number;
    }>;
  } {
    const now = new Date();
    const certificates = Array.from(this.certificates.values());

    const expiringCertificates = certificates.filter(cert => {
      const daysUntilExpiry = (cert.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= cert.renewalThreshold && daysUntilExpiry > 0;
    });

    const expiredCertificates = certificates.filter(cert => cert.notAfter < now);

    const certificateDetails = certificates.map(cert => {
      const expiresIn = Math.ceil((cert.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: cert.id,
        commonName: cert.commonName,
        issuer: cert.issuer,
        status: cert.status,
        expiresIn,
        autoRenew: cert.autoRenew,
        lastRenewal: cert.metadata.lastRenewal
      };
    });

    const upcomingRenewals = certificates
      .filter(cert => cert.autoRenew)
      .map(cert => {
        const renewalDate = new Date(cert.notAfter.getTime() - cert.renewalThreshold * 24 * 60 * 60 * 1000);
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          certificateId: cert.id,
          commonName: cert.commonName,
          renewalDate,
          daysUntilRenewal
        };
      })
      .filter(renewal => renewal.daysUntilRenewal > 0)
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

    return {
      summary: {
        totalCertificates: certificates.length,
        activeCertificates: certificates.filter(cert => cert.status === 'active').length,
        expiringCertificates: expiringCertificates.length,
        expiredCertificates: expiredCertificates.length,
        autoRenewEnabled: certificates.filter(cert => cert.autoRenew).length
      },
      certificates: certificateDetails,
      upcomingRenewals
    };
  }

  // Helper methods
  private async generateKeyPair(algorithm: 'rsa' | 'ecdsa', keySize: number): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    return new Promise((resolve, reject) => {
      if (algorithm === 'rsa') {
        crypto.generateKeyPair('rsa', {
          modulusLength: keySize,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve({ publicKey, privateKey });
        });
      } else {
        crypto.generateKeyPair('ec', {
          namedCurve: 'prime256v1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve({ publicKey, privateKey });
        });
      }
    });
  }

  private async createCSR(options: {
    commonName: string;
    subjectAltNames: string[];
    country: string;
    state: string;
    city: string;
    organization: string;
    organizationalUnit: string;
    email: string;
    publicKey: string;
  }): Promise<string> {
    // This would create an actual CSR using a crypto library
    // For demo, return a placeholder
    const csr = `-----BEGIN CERTIFICATE REQUEST-----
[CSR for ${options.commonName} would be here]
-----END CERTIFICATE REQUEST-----`;
    
    return csr;
  }

  private async parseCertificate(certificatePem: string): Promise<any> {
    // This would parse an actual certificate using a crypto library
    // For demo, return mock certificate info
    return {
      subject: {
        commonName: 'bothsides.app',
        organization: 'Both Sides, Inc.'
      },
      issuer: {
        commonName: 'Let\'s Encrypt Authority X3',
        organization: 'Let\'s Encrypt'
      },
      subjectAltNames: ['www.bothsides.app', 'api.bothsides.app'],
      serialNumber: '1234567890abcdef',
      notBefore: new Date(),
      notAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      fingerprint: crypto.createHash('sha256').update(certificatePem).digest('hex')
    };
  }

  private getCertificateStatus(notAfter: Date): Certificate['status'] {
    const now = new Date();
    const daysUntilExpiry = (notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'active';
  }

  private async validateCertificateChain(certificate: Certificate): Promise<boolean> {
    // This would validate the certificate chain
    // For demo, return true
    return certificate.certificateChain.length > 0;
  }

  private async checkRevocationStatus(certificate: Certificate): Promise<'good' | 'revoked' | 'unknown'> {
    // This would check OCSP or CRL for revocation status
    // For demo, return 'good'
    return 'good';
  }

  private async validateCertificateDetails(certificate: Certificate): Promise<{
    commonNameMatch: boolean;
    sanMatch: boolean;
    keyUsageValid: boolean;
    extendedKeyUsageValid: boolean;
    basicConstraintsValid: boolean;
  }> {
    // This would validate certificate extensions and usage
    // For demo, return all valid
    return {
      commonNameMatch: true,
      sanMatch: true,
      keyUsageValid: true,
      extendedKeyUsageValid: true,
      basicConstraintsValid: true
    };
  }

  private async simulateCertificateRenewal(
    oldCert: Certificate,
    request: CertificateRequest
  ): Promise<Partial<Certificate>> {
    // Simulate certificate renewal with new dates
    const now = new Date();
    const newNotAfter = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    return {
      notBefore: now,
      notAfter: newNotAfter,
      status: this.getCertificateStatus(newNotAfter),
      serialNumber: crypto.randomBytes(16).toString('hex'),
      fingerprint: crypto.randomBytes(32).toString('hex')
    };
  }

  private async saveCSRToFile(request: CertificateRequest): Promise<void> {
    const csrPath = path.join(this.certStorePath, `${request.id}.csr`);
    const keyPath = path.join(this.certStorePath, `${request.id}.key`);
    
    await fs.writeFile(csrPath, request.csr);
    await fs.writeFile(keyPath, request.privateKey);
    
    console.log(`💾 CSR saved: ${csrPath}`);
  }

  private async saveCertificateFiles(certificate: Certificate): Promise<void> {
    const certPath = path.join(this.certStorePath, `${certificate.id}.crt`);
    const keyPath = path.join(this.certStorePath, `${certificate.id}.key`);
    const chainPath = path.join(this.certStorePath, `${certificate.id}-chain.crt`);
    
    await fs.writeFile(certPath, certificate.publicKey);
    
    if (certificate.privateKey) {
      await fs.writeFile(keyPath, certificate.privateKey);
    }
    
    if (certificate.certificateChain.length > 0) {
      await fs.writeFile(chainPath, certificate.certificateChain.join('\n'));
    }
    
    console.log(`💾 Certificate files saved for: ${certificate.commonName}`);
  }

  private async loadCertificates(): Promise<void> {
    // Load certificates from files
    console.log('📋 Loading certificates from store...');
  }

  private scheduleCertificateMonitoring(): void {
    // Check for expiring certificates daily
    setInterval(() => {
      this.checkExpiringCertificates();
    }, 24 * 60 * 60 * 1000);

    console.log('⏰ Certificate monitoring scheduled');
  }

  private async checkExpiringCertificates(): Promise<void> {
    console.log('🔍 Checking for expiring certificates...');
    
    const now = new Date();
    
    for (const certificate of this.certificates.values()) {
      const daysUntilExpiry = (certificate.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry <= certificate.renewalThreshold && certificate.autoRenew) {
        console.log(`🔄 Auto-renewing certificate: ${certificate.commonName}`);
        try {
          await this.renewCertificate(certificate.id);
        } catch (error) {
          console.error(`❌ Auto-renewal failed for ${certificate.commonName}:`, error);
        }
      } else if (daysUntilExpiry <= 7) {
        console.log(`⚠️ Certificate expiring soon: ${certificate.commonName} (${Math.ceil(daysUntilExpiry)} days)`);
      }
      
      // Update certificate status
      certificate.status = this.getCertificateStatus(certificate.notAfter);
    }
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }
}

// Export singleton instance
export const certificateManager = new CertificateManager();

export default {
  CertificateManager,
  certificateManager
};
