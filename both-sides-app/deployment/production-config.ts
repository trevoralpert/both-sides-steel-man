/**
 * Production Deployment Configuration
 * Centralized configuration for production environment setup
 */

export interface ProductionConfig {
  app: {
    name: string;
    version: string;
    environment: string;
    domains: string[];
    regions: string[];
  };
  infrastructure: {
    frontend: VercelConfig;
    backend: RailwayConfig;
    database: DatabaseConfig;
    cache: CacheConfig;
    cdn: CDNConfig;
  };
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  performance: PerformanceConfig;
  compliance: ComplianceConfig;
}

export interface VercelConfig {
  projectName: string;
  framework: string;
  regions: string[];
  domains: string[];
  buildSettings: {
    nodeVersion: string;
    buildCommand: string;
    outputDirectory: string;
    installCommand: string;
  };
  environmentVariables: Record<string, string>;
  headers: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
  redirects: Array<{
    source: string;
    destination: string;
    permanent: boolean;
  }>;
  rewrites: Array<{
    source: string;
    destination: string;
  }>;
}

export interface RailwayConfig {
  serviceName: string;
  region: string;
  runtime: string;
  scaling: {
    minInstances: number;
    maxInstances: number;
    cpuLimit: string;
    memoryLimit: string;
  };
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  environmentVariables: Record<string, string>;
}

export interface DatabaseConfig {
  postgresql: {
    provider: string;
    instance: string;
    region: string;
    version: string;
    storage: string;
    connections: {
      max: number;
      timeout: number;
      idle: number;
    };
    backup: {
      enabled: boolean;
      frequency: string;
      retention: number;
      encryption: boolean;
    };
  };
  redis: {
    provider: string;
    instance: string;
    region: string;
    clustering: boolean;
    persistence: boolean;
    maxMemory: string;
  };
}

export interface CacheConfig {
  strategy: string;
  ttl: {
    static: number;
    dynamic: number;
    api: number;
  };
  purging: {
    enabled: boolean;
    triggers: string[];
  };
}

export interface CDNConfig {
  provider: string;
  regions: string[];
  caching: {
    staticAssets: number;
    dynamicContent: number;
    apiResponses: number;
  };
  compression: {
    enabled: boolean;
    algorithms: string[];
  };
  security: {
    ddosProtection: boolean;
    wafEnabled: boolean;
    rateLimiting: boolean;
  };
}

export interface SecurityConfig {
  ssl: {
    enabled: boolean;
    hsts: boolean;
    certificateType: string;
  };
  headers: {
    csp: string;
    frameOptions: string;
    contentTypeOptions: string;
    xssProtection: string;
  };
  authentication: {
    provider: string;
    mfa: boolean;
    sessionTimeout: number;
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm: string;
  };
}

export interface MonitoringConfig {
  logging: {
    level: string;
    format: string;
    retention: number;
  };
  metrics: {
    enabled: boolean;
    provider: string;
    interval: number;
  };
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: Record<string, number>;
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;
  };
}

export interface PerformanceConfig {
  optimization: {
    bundleAnalysis: boolean;
    codesplitting: boolean;
    treeshaking: boolean;
    minification: boolean;
  };
  caching: {
    browser: number;
    cdn: number;
    api: number;
  };
  compression: {
    gzip: boolean;
    brotli: boolean;
  };
}

export interface ComplianceConfig {
  ferpa: {
    enabled: boolean;
    mode: string;
    auditLogging: boolean;
  };
  coppa: {
    enabled: boolean;
    mode: string;
    parentalConsent: boolean;
  };
  gdpr: {
    enabled: boolean;
    dataRetention: number;
    rightToErasure: boolean;
  };
  dataRetention: {
    policy: string;
    periods: Record<string, number>;
  };
}

export const PRODUCTION_CONFIG: ProductionConfig = {
  app: {
    name: 'Both Sides',
    version: '1.0.0',
    environment: 'production',
    domains: ['bothsides.app', 'www.bothsides.app'],
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']
  },
  
  infrastructure: {
    frontend: {
      projectName: 'both-sides-production',
      framework: 'nextjs',
      regions: ['iad1', 'sfo1', 'lhr1', 'fra1', 'nrt1'],
      domains: ['bothsides.app', 'www.bothsides.app'],
      buildSettings: {
        nodeVersion: '18.x',
        buildCommand: 'yarn build',
        outputDirectory: '.next',
        installCommand: 'yarn install --frozen-lockfile'
      },
      environmentVariables: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'production',
        NEXT_PUBLIC_APP_VERSION: '1.0.0',
        NEXT_TELEMETRY_DISABLED: '1'
      },
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
          ]
        }
      ],
      redirects: [
        {
          source: '/www.bothsides.app/(.*)',
          destination: 'https://bothsides.app/$1',
          permanent: true
        }
      ],
      rewrites: [
        {
          source: '/api/backend/(.*)',
          destination: 'https://api.bothsides.app/$1'
        }
      ]
    },
    
    backend: {
      serviceName: 'both-sides-api',
      region: 'us-east-1',
      runtime: 'nodejs18',
      scaling: {
        minInstances: 2,
        maxInstances: 10,
        cpuLimit: '1000m',
        memoryLimit: '2Gi'
      },
      healthCheck: {
        path: '/health',
        interval: 30,
        timeout: 10,
        retries: 3
      },
      environmentVariables: {
        NODE_ENV: 'production',
        PORT: '3001',
        LOG_LEVEL: 'info'
      }
    },
    
    database: {
      postgresql: {
        provider: 'neon',
        instance: 'production-primary',
        region: 'us-east-1',
        version: '15',
        storage: '100GB',
        connections: {
          max: 20,
          timeout: 30000,
          idle: 600000
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          retention: 90,
          encryption: true
        }
      },
      redis: {
        provider: 'upstash',
        instance: 'production-cluster',
        region: 'us-east-1',
        clustering: true,
        persistence: true,
        maxMemory: '1GB'
      }
    },
    
    cache: {
      strategy: 'stale-while-revalidate',
      ttl: {
        static: 31536000, // 1 year
        dynamic: 3600,    // 1 hour
        api: 300          // 5 minutes
      },
      purging: {
        enabled: true,
        triggers: ['deployment', 'content-update']
      }
    },
    
    cdn: {
      provider: 'vercel-edge',
      regions: ['global'],
      caching: {
        staticAssets: 31536000,
        dynamicContent: 3600,
        apiResponses: 300
      },
      compression: {
        enabled: true,
        algorithms: ['gzip', 'brotli']
      },
      security: {
        ddosProtection: true,
        wafEnabled: true,
        rateLimiting: true
      }
    }
  },
  
  security: {
    ssl: {
      enabled: true,
      hsts: true,
      certificateType: 'letsencrypt'
    },
    headers: {
      csp: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.bothsides.app; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.bothsides.app wss://realtime.bothsides.app;",
      frameOptions: 'DENY',
      contentTypeOptions: 'nosniff',
      xssProtection: '1; mode=block'
    },
    authentication: {
      provider: 'clerk',
      mfa: true,
      sessionTimeout: 86400
    },
    encryption: {
      atRest: true,
      inTransit: true,
      algorithm: 'AES-256'
    }
  },
  
  monitoring: {
    logging: {
      level: 'info',
      format: 'json',
      retention: 90
    },
    metrics: {
      enabled: true,
      provider: 'vercel-analytics',
      interval: 60
    },
    alerting: {
      enabled: true,
      channels: ['email', 'slack'],
      thresholds: {
        errorRate: 0.05,
        responseTime: 2000,
        availability: 0.99
      }
    },
    tracing: {
      enabled: true,
      sampleRate: 0.1
    }
  },
  
  performance: {
    optimization: {
      bundleAnalysis: true,
      codesplitting: true,
      treeshaking: true,
      minification: true
    },
    caching: {
      browser: 31536000,
      cdn: 86400,
      api: 300
    },
    compression: {
      gzip: true,
      brotli: true
    }
  },
  
  compliance: {
    ferpa: {
      enabled: true,
      mode: 'strict',
      auditLogging: true
    },
    coppa: {
      enabled: true,
      mode: 'strict',
      parentalConsent: true
    },
    gdpr: {
      enabled: true,
      dataRetention: 2555, // 7 years
      rightToErasure: true
    },
    dataRetention: {
      policy: 'educational_standard',
      periods: {
        student_records: 2555,    // 7 years
        audit_logs: 2555,        // 7 years
        system_logs: 365,        // 1 year
        user_sessions: 30        // 30 days
      }
    }
  }
};

export class ProductionDeploymentManager {
  private config: ProductionConfig;

  constructor(config: ProductionConfig = PRODUCTION_CONFIG) {
    this.config = config;
  }

  /**
   * Generate Vercel deployment configuration
   */
  generateVercelConfig(): any {
    const { frontend } = this.config.infrastructure;
    
    return {
      version: 2,
      name: frontend.projectName,
      alias: frontend.domains,
      regions: frontend.regions,
      framework: frontend.framework,
      build: {
        env: frontend.environmentVariables
      },
      functions: {
        'app/**': {
          maxDuration: 30
        }
      },
      headers: frontend.headers,
      redirects: frontend.redirects,
      rewrites: frontend.rewrites,
      installCommand: frontend.buildSettings.installCommand,
      buildCommand: frontend.buildSettings.buildCommand,
      outputDirectory: frontend.buildSettings.outputDirectory,
      cleanUrls: true,
      trailingSlash: false
    };
  }

  /**
   * Generate Railway deployment configuration
   */
  generateRailwayConfig(): any {
    const { backend } = this.config.infrastructure;
    
    return {
      build: {
        builder: 'NIXPACKS'
      },
      deploy: {
        startCommand: 'npm run start:prod',
        healthcheckPath: backend.healthCheck.path,
        healthcheckTimeout: backend.healthCheck.timeout,
        restartPolicyType: 'ON_FAILURE',
        restartPolicyMaxRetries: backend.healthCheck.retries
      },
      environments: {
        production: {
          variables: backend.environmentVariables
        }
      }
    };
  }

  /**
   * Generate database configuration scripts
   */
  generateDatabaseConfig(): {
    postgresql: string;
    redis: string;
  } {
    const { postgresql, redis } = this.config.infrastructure.database;
    
    const postgresqlConfig = `
-- PostgreSQL Production Configuration
-- Instance: ${postgresql.instance}
-- Region: ${postgresql.region}

-- Connection Settings
ALTER SYSTEM SET max_connections = ${postgresql.connections.max};
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Security Settings
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_statement = 'mod';

-- Backup Configuration
${postgresql.backup.enabled ? `
-- Enable point-in-time recovery
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /backup/archive/%f';
` : ''}

SELECT pg_reload_conf();
    `;

    const redisConfig = `
# Redis Production Configuration
# Instance: ${redis.instance}
# Region: ${redis.region}

# Memory Management
maxmemory ${redis.maxMemory}
maxmemory-policy allkeys-lru

# Persistence
${redis.persistence ? `
save 900 1
save 300 10
save 60 10000
` : 'save ""'}

# Security
requirepass ${redis.clustering ? 'cluster-password' : 'redis-password'}

# Clustering
${redis.clustering ? `
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
` : ''}

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
    `;

    return {
      postgresql: postgresqlConfig,
      redis: redisConfig
    };
  }

  /**
   * Generate monitoring configuration
   */
  generateMonitoringConfig(): any {
    const { monitoring } = this.config;
    
    return {
      logging: {
        level: monitoring.logging.level,
        format: monitoring.logging.format,
        outputs: ['stdout', 'file'],
        retention: `${monitoring.logging.retention}d`
      },
      metrics: {
        enabled: monitoring.metrics.enabled,
        interval: `${monitoring.metrics.interval}s`,
        endpoints: ['/metrics', '/health']
      },
      alerts: monitoring.alerting.enabled ? {
        rules: [
          {
            name: 'high_error_rate',
            condition: `error_rate > ${monitoring.alerting.thresholds.errorRate}`,
            channels: monitoring.alerting.channels
          },
          {
            name: 'slow_response_time',
            condition: `response_time > ${monitoring.alerting.thresholds.responseTime}ms`,
            channels: monitoring.alerting.channels
          },
          {
            name: 'low_availability',
            condition: `availability < ${monitoring.alerting.thresholds.availability}`,
            channels: monitoring.alerting.channels
          }
        ]
      } : null
    };
  }

  /**
   * Generate security configuration
   */
  generateSecurityConfig(): any {
    const { security } = this.config;
    
    return {
      ssl: {
        enabled: security.ssl.enabled,
        hsts: security.ssl.hsts,
        certificate: security.ssl.certificateType
      },
      headers: security.headers,
      authentication: security.authentication,
      encryption: security.encryption,
      rateLimiting: {
        windowMs: 900000, // 15 minutes
        max: 100,
        skipSuccessfulRequests: false
      }
    };
  }

  /**
   * Validate production configuration
   */
  validateConfiguration(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required domains
    if (!this.config.app.domains.length) {
      errors.push('No domains configured for production');
    }

    // Validate SSL configuration
    if (!this.config.security.ssl.enabled) {
      errors.push('SSL must be enabled in production');
    }

    // Validate backup configuration
    if (!this.config.infrastructure.database.postgresql.backup.enabled) {
      warnings.push('Database backups are not enabled');
    }

    // Validate monitoring
    if (!this.config.monitoring.alerting.enabled) {
      warnings.push('Alerting is not enabled');
    }

    // Validate compliance
    if (!this.config.compliance.ferpa.enabled) {
      errors.push('FERPA compliance must be enabled for educational platform');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate deployment checklist
   */
  generateDeploymentChecklist(): string[] {
    return [
      '✅ Verify all environment variables are set',
      '✅ Confirm SSL certificates are configured',
      '✅ Test database connections and migrations',
      '✅ Verify Redis cache connectivity',
      '✅ Check CDN configuration and caching',
      '✅ Validate security headers and CSP',
      '✅ Test authentication and authorization',
      '✅ Verify monitoring and alerting setup',
      '✅ Confirm backup and recovery procedures',
      '✅ Test performance and load handling',
      '✅ Validate compliance configurations',
      '✅ Run security scans and penetration tests',
      '✅ Verify rollback procedures',
      '✅ Test health checks and auto-scaling',
      '✅ Confirm logging and audit trails'
    ];
  }
}

export const productionDeploymentManager = new ProductionDeploymentManager();

export default {
  PRODUCTION_CONFIG,
  ProductionDeploymentManager,
  productionDeploymentManager
};
