import express, { Application, Request, Response } from 'express';
import { Server } from 'http';
import * as crypto from 'crypto';

/**
 * External System Mock Server
 * 
 * A comprehensive mock server that simulates external educational systems
 * for integration testing. Supports multiple provider types with realistic
 * API responses, error scenarios, and performance characteristics.
 * 
 * Features:
 * - Multiple provider type simulation (TimeBack, Google Classroom, Canvas, etc.)
 * - Realistic data generation with relationships
 * - Configurable response delays and error rates
 * - OAuth 2.0 authentication simulation
 * - Webhook endpoint simulation
 * - Rate limiting simulation
 * - Pagination support
 * - Real-time event simulation
 */

export interface MockServerConfig {
  port: number;
  providerType: 'timeback' | 'google-classroom' | 'canvas' | 'generic';
  dataConfig: {
    organizationCount: number;
    userCount: number;
    classCount: number;
    enrollmentCount: number;
  };
  behaviorConfig: {
    responseDelayMs: { min: number; max: number };
    errorRate: number; // 0.0 to 1.0
    authErrorRate: number;
    dataCorruptionRate: number;
    rateLimitConfig: {
      enabled: boolean;
      requestsPerMinute: number;
    };
  };
  features: {
    supportsPagination: boolean;
    supportsWebhooks: boolean;
    supportsRealTime: boolean;
    supportsIncrementalSync: boolean;
    supportsBulkOperations: boolean;
  };
}

export interface MockDataStore {
  organizations: MockOrganization[];
  users: MockUser[];
  classes: MockClass[];
  enrollments: MockEnrollment[];
  sessions: Map<string, MockSession>;
  webhookSubscriptions: MockWebhookSubscription[];
  auditLog: MockAuditEntry[];
}

export interface MockOrganization {
  id: string;
  name: string;
  type: 'school' | 'district' | 'department';
  parentId?: string;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
  organizationIds: string[];
  active: boolean;
  profile: Record<string, any>;
  preferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MockClass {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  teacherIds: string[];
  subject: string;
  gradeLevel?: string;
  schedule: Record<string, any>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MockEnrollment {
  id: string;
  userId: string;
  classId: string;
  role: 'student' | 'teacher' | 'assistant';
  status: 'active' | 'inactive' | 'pending';
  enrolledAt: string;
  updatedAt: string;
  version: number;
}

export interface MockSession {
  id: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope: string[];
  metadata: Record<string, any>;
}

export interface MockWebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface MockAuditEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  userId?: string;
  requestId: string;
  duration: number;
  statusCode: number;
  errorMessage?: string;
}

export class ExternalSystemMockServer {
  private app: Application;
  private server?: Server;
  private dataStore: MockDataStore;
  private config: MockServerConfig;
  private requestCounts = new Map<string, number[]>(); // IP -> timestamps

  constructor(config: MockServerConfig) {
    this.config = config;
    this.app = express();
    this.dataStore = {
      organizations: [],
      users: [],
      classes: [],
      enrollments: [],
      sessions: new Map(),
      webhookSubscriptions: [],
      auditLog: [],
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.generateMockData();
  }

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          console.log(`🎭 Mock ${this.config.providerType} server running on port ${this.config.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(`🎭 Mock ${this.config.providerType} server stopped`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * Reset mock data to initial state
   */
  resetData(): void {
    this.dataStore.organizations = [];
    this.dataStore.users = [];
    this.dataStore.classes = [];
    this.dataStore.enrollments = [];
    this.dataStore.sessions.clear();
    this.dataStore.auditLog = [];
    this.generateMockData();
  }

  /**
   * Get current mock data
   */
  getData(): MockDataStore {
    return this.dataStore;
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
      next();
    });

    // Rate limiting middleware
    if (this.config.behaviorConfig.rateLimitConfig.enabled) {
      this.app.use((req, res, next) => {
        const ip = req.ip || 'unknown';
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const limit = this.config.behaviorConfig.rateLimitConfig.requestsPerMinute;

        if (!this.requestCounts.has(ip)) {
          this.requestCounts.set(ip, []);
        }

        const timestamps = this.requestCounts.get(ip)!;
        // Remove old timestamps outside the window
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
        this.requestCounts.set(ip, validTimestamps);

        if (validTimestamps.length >= limit) {
          res.status(429).json({
            error: 'Rate limit exceeded',
            limit,
            windowMs,
            retryAfter: Math.ceil(windowMs / 1000),
          });
          return;
        }

        validTimestamps.push(now);
        next();
      });
    }

    // Response delay simulation
    this.app.use(async (req, res, next) => {
      const { min, max } = this.config.behaviorConfig.responseDelayMs;
      const delay = Math.random() * (max - min) + min;
      await new Promise(resolve => setTimeout(resolve, delay));
      next();
    });

    // Error rate simulation
    this.app.use((req, res, next) => {
      if (Math.random() < this.config.behaviorConfig.errorRate) {
        const errors = [
          { status: 500, message: 'Internal server error' },
          { status: 503, message: 'Service temporarily unavailable' },
          { status: 504, message: 'Gateway timeout' },
        ];
        const error = errors[Math.floor(Math.random() * errors.length)];
        res.status(error.status).json({ error: error.message });
        return;
      }
      next();
    });

    // Audit logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const auditEntry: MockAuditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          endpoint: req.path,
          method: req.method,
          requestId: req.headers['x-request-id'] as string,
          duration: Date.now() - startTime,
          statusCode: res.statusCode,
          errorMessage: res.statusCode >= 400 ? 'Request failed' : undefined,
        };
        
        this.dataStore.auditLog.push(auditEntry);
        
        // Keep only last 1000 audit entries
        if (this.dataStore.auditLog.length > 1000) {
          this.dataStore.auditLog = this.dataStore.auditLog.slice(-1000);
        }
      });

      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        provider: this.config.providerType,
      });
    });

    // Authentication routes
    this.setupAuthRoutes();

    // API routes based on provider type
    switch (this.config.providerType) {
      case 'timeback':
        this.setupTimeBackRoutes();
        break;
      case 'google-classroom':
        this.setupGoogleClassroomRoutes();
        break;
      case 'canvas':
        this.setupCanvasRoutes();
        break;
      default:
        this.setupGenericRoutes();
    }

    // Webhook routes
    if (this.config.features.supportsWebhooks) {
      this.setupWebhookRoutes();
    }

    // Admin routes for testing
    this.setupAdminRoutes();
  }

  /**
   * Setup authentication routes
   */
  private setupAuthRoutes(): void {
    // OAuth token endpoint
    this.app.post('/oauth/token', (req, res) => {
      if (Math.random() < this.config.behaviorConfig.authErrorRate) {
        res.status(401).json({ error: 'invalid_credentials' });
        return;
      }

      const session: MockSession = {
        id: crypto.randomUUID(),
        accessToken: this.generateAccessToken(),
        refreshToken: this.generateRefreshToken(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        scope: req.body.scope || ['read', 'write'],
        metadata: { grantType: req.body.grant_type || 'client_credentials' },
      };

      this.dataStore.sessions.set(session.accessToken, session);

      res.json({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: session.scope.join(' '),
      });
    });

    // Token refresh endpoint
    this.app.post('/oauth/refresh', (req, res) => {
      const refreshToken = req.body.refresh_token;
      
      // Find session by refresh token
      const session = Array.from(this.dataStore.sessions.values())
        .find(s => s.refreshToken === refreshToken);

      if (!session) {
        res.status(401).json({ error: 'invalid_refresh_token' });
        return;
      }

      // Generate new tokens
      const newSession: MockSession = {
        ...session,
        id: crypto.randomUUID(),
        accessToken: this.generateAccessToken(),
        refreshToken: this.generateRefreshToken(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      // Remove old session
      this.dataStore.sessions.delete(session.accessToken);
      this.dataStore.sessions.set(newSession.accessToken, newSession);

      res.json({
        access_token: newSession.accessToken,
        refresh_token: newSession.refreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: newSession.scope.join(' '),
      });
    });

    // Token validation middleware
    this.app.use('/api/*', (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
      }

      const token = authHeader.substring(7);
      const session = this.dataStore.sessions.get(token);

      if (!session) {
        res.status(401).json({ error: 'Invalid access token' });
        return;
      }

      if (new Date(session.expiresAt) < new Date()) {
        this.dataStore.sessions.delete(token);
        res.status(401).json({ error: 'Access token expired' });
        return;
      }

      req.headers['x-user-session'] = session.id;
      next();
    });
  }

  /**
   * Setup TimeBack-specific routes
   */
  private setupTimeBackRoutes(): void {
    // Schools (Organizations)
    this.app.get('/api/v1/schools', (req, res) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const paginatedData = this.paginateData(this.dataStore.organizations, page, limit);
      
      res.json({
        data: paginatedData.data,
        meta: paginatedData.meta,
      });
    });

    this.app.get('/api/v1/schools/:id', (req, res) => {
      const org = this.dataStore.organizations.find(o => o.id === req.params.id);
      if (!org) {
        res.status(404).json({ error: 'School not found' });
        return;
      }
      res.json({ data: org });
    });

    // Users
    this.app.get('/api/v1/users', (req, res) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const role = req.query.role as string;
      
      let users = this.dataStore.users;
      if (role) {
        users = users.filter(u => u.role === role);
      }

      const paginatedData = this.paginateData(users, page, limit);
      
      res.json({
        data: paginatedData.data,
        meta: paginatedData.meta,
      });
    });

    this.app.get('/api/v1/users/:id', (req, res) => {
      const user = this.dataStore.users.find(u => u.id === req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ data: user });
    });

    // Classes
    this.app.get('/api/v1/classes', (req, res) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const paginatedData = this.paginateData(this.dataStore.classes, page, limit);
      
      res.json({
        data: paginatedData.data,
        meta: paginatedData.meta,
      });
    });

    // Enrollments
    this.app.get('/api/v1/enrollments', (req, res) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const classId = req.query.class_id as string;
      
      let enrollments = this.dataStore.enrollments;
      if (classId) {
        enrollments = enrollments.filter(e => e.classId === classId);
      }

      const paginatedData = this.paginateData(enrollments, page, limit);
      
      res.json({
        data: paginatedData.data,
        meta: paginatedData.meta,
      });
    });

    // Changes endpoint for incremental sync
    if (this.config.features.supportsIncrementalSync) {
      this.app.get('/api/v1/changes', (req, res) => {
        const since = req.query.since as string;
        const sinceDate = since ? new Date(since) : new Date(0);
        
        const changes = this.dataStore.auditLog
          .filter(entry => new Date(entry.timestamp) > sinceDate)
          .map(entry => ({
            id: entry.id,
            type: this.getChangeTypeFromEndpoint(entry.endpoint),
            timestamp: entry.timestamp,
            entityId: this.extractEntityIdFromEndpoint(entry.endpoint),
            operation: this.getOperationFromMethod(entry.method),
          }));

        res.json({ data: changes });
      });
    }
  }

  /**
   * Setup Google Classroom routes (similar pattern)
   */
  private setupGoogleClassroomRoutes(): void {
    // TODO: Implement Google Classroom specific routes
    this.setupGenericRoutes();
  }

  /**
   * Setup Canvas routes (similar pattern)
   */
  private setupCanvasRoutes(): void {
    // TODO: Implement Canvas specific routes
    this.setupGenericRoutes();
  }

  /**
   * Setup generic API routes
   */
  private setupGenericRoutes(): void {
    this.app.get('/api/organizations', (req, res) => {
      res.json({ data: this.dataStore.organizations });
    });

    this.app.get('/api/users', (req, res) => {
      res.json({ data: this.dataStore.users });
    });

    this.app.get('/api/classes', (req, res) => {
      res.json({ data: this.dataStore.classes });
    });

    this.app.get('/api/enrollments', (req, res) => {
      res.json({ data: this.dataStore.enrollments });
    });
  }

  /**
   * Setup webhook routes
   */
  private setupWebhookRoutes(): void {
    this.app.post('/api/webhooks', (req, res) => {
      const subscription: MockWebhookSubscription = {
        id: crypto.randomUUID(),
        url: req.body.url,
        events: req.body.events || [],
        secret: crypto.randomBytes(32).toString('hex'),
        active: true,
        createdAt: new Date().toISOString(),
      };

      this.dataStore.webhookSubscriptions.push(subscription);

      res.status(201).json({ data: subscription });
    });

    this.app.get('/api/webhooks', (req, res) => {
      res.json({ data: this.dataStore.webhookSubscriptions });
    });

    this.app.delete('/api/webhooks/:id', (req, res) => {
      const index = this.dataStore.webhookSubscriptions.findIndex(w => w.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ error: 'Webhook subscription not found' });
        return;
      }

      this.dataStore.webhookSubscriptions.splice(index, 1);
      res.status(204).send();
    });
  }

  /**
   * Setup admin routes for testing
   */
  private setupAdminRoutes(): void {
    this.app.get('/admin/data', (req, res) => {
      res.json({
        organizations: this.dataStore.organizations.length,
        users: this.dataStore.users.length,
        classes: this.dataStore.classes.length,
        enrollments: this.dataStore.enrollments.length,
        sessions: this.dataStore.sessions.size,
        webhooks: this.dataStore.webhookSubscriptions.length,
      });
    });

    this.app.post('/admin/reset', (req, res) => {
      this.resetData();
      res.json({ message: 'Data reset successfully' });
    });

    this.app.get('/admin/audit', (req, res) => {
      res.json({ data: this.dataStore.auditLog });
    });

    this.app.post('/admin/simulate-event', (req, res) => {
      // Simulate webhook events for testing
      const event = req.body;
      this.simulateWebhookEvent(event);
      res.json({ message: 'Event simulated' });
    });
  }

  /**
   * Generate mock data
   */
  private generateMockData(): void {
    console.log(`🎭 Generating mock data for ${this.config.providerType}...`);

    // Generate organizations
    for (let i = 0; i < this.config.dataConfig.organizationCount; i++) {
      this.dataStore.organizations.push(this.createMockOrganization(i));
    }

    // Generate users
    for (let i = 0; i < this.config.dataConfig.userCount; i++) {
      this.dataStore.users.push(this.createMockUser(i));
    }

    // Generate classes
    for (let i = 0; i < this.config.dataConfig.classCount; i++) {
      this.dataStore.classes.push(this.createMockClass(i));
    }

    // Generate enrollments
    for (let i = 0; i < this.config.dataConfig.enrollmentCount; i++) {
      this.dataStore.enrollments.push(this.createMockEnrollment(i));
    }

    console.log(`🎭 Generated ${this.dataStore.organizations.length} orgs, ${this.dataStore.users.length} users, ${this.dataStore.classes.length} classes, ${this.dataStore.enrollments.length} enrollments`);
  }

  private createMockOrganization(index: number): MockOrganization {
    return {
      id: `org_${index.toString().padStart(3, '0')}`,
      name: `School ${index + 1}`,
      type: Math.random() > 0.8 ? 'district' : 'school',
      parentId: Math.random() > 0.7 ? `org_${Math.floor(Math.random() * index).toString().padStart(3, '0')}` : undefined,
      settings: {
        timezone: 'America/New_York',
        academicYear: '2024-2025',
      },
      metadata: {
        region: `Region ${Math.floor(index / 10) + 1}`,
        studentCapacity: Math.floor(Math.random() * 1000) + 500,
      },
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  private createMockUser(index: number): MockUser {
    const roles = ['student', 'teacher', 'admin'] as const;
    const role = roles[Math.floor(Math.random() * roles.length)];
    
    return {
      id: `user_${index.toString().padStart(4, '0')}`,
      email: `user${index}@example.com`,
      firstName: `First${index}`,
      lastName: `Last${index}`,
      role,
      organizationIds: [`org_${Math.floor(Math.random() * this.config.dataConfig.organizationCount).toString().padStart(3, '0')}`],
      active: Math.random() > 0.1, // 90% active
      profile: {
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=User${index}`,
        bio: `Mock user ${index} for testing`,
      },
      preferences: {
        notifications: Math.random() > 0.3,
        theme: Math.random() > 0.5 ? 'dark' : 'light',
      },
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  private createMockClass(index: number): MockClass {
    const subjects = ['Math', 'Science', 'English', 'History', 'Art', 'Music', 'PE'];
    const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    
    return {
      id: `class_${index.toString().padStart(3, '0')}`,
      name: `${subjects[Math.floor(Math.random() * subjects.length)]} ${grades[Math.floor(Math.random() * grades.length)]}`,
      description: `Mock class ${index} for testing integration`,
      organizationId: `org_${Math.floor(Math.random() * this.config.dataConfig.organizationCount).toString().padStart(3, '0')}`,
      teacherIds: [`user_${Math.floor(Math.random() * this.config.dataConfig.userCount).toString().padStart(4, '0')}`],
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      gradeLevel: grades[Math.floor(Math.random() * grades.length)],
      schedule: {
        days: ['monday', 'wednesday', 'friday'],
        time: '10:00 AM',
        duration: 50,
      },
      settings: {
        maxStudents: Math.floor(Math.random() * 20) + 15,
        allowLateSubmissions: Math.random() > 0.5,
      },
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  private createMockEnrollment(index: number): MockEnrollment {
    const roles = ['student', 'teacher'] as const;
    const statuses = ['active', 'inactive'] as const;
    
    return {
      id: `enrollment_${index.toString().padStart(4, '0')}`,
      userId: `user_${Math.floor(Math.random() * this.config.dataConfig.userCount).toString().padStart(4, '0')}`,
      classId: `class_${Math.floor(Math.random() * this.config.dataConfig.classCount).toString().padStart(3, '0')}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      enrolledAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  private generateAccessToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private paginateData<T>(data: T[], page: number, limit: number): {
    data: T[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  } {
    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: data.slice(start, end),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  private getChangeTypeFromEndpoint(endpoint: string): string {
    if (endpoint.includes('/users')) return 'user';
    if (endpoint.includes('/classes')) return 'class';
    if (endpoint.includes('/schools')) return 'organization';
    if (endpoint.includes('/enrollments')) return 'enrollment';
    return 'unknown';
  }

  private extractEntityIdFromEndpoint(endpoint: string): string {
    const matches = endpoint.match(/\/([^\/]+)$/);
    return matches ? matches[1] : 'unknown';
  }

  private getOperationFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      case 'GET': return 'read';
      default: return 'unknown';
    }
  }

  private async simulateWebhookEvent(event: any): Promise<void> {
    // Simulate sending webhook events to subscribed endpoints
    for (const subscription of this.dataStore.webhookSubscriptions) {
      if (subscription.active && subscription.events.includes(event.type)) {
        try {
          // In a real implementation, this would make HTTP requests to webhook URLs
          console.log(`🎭 Simulating webhook: ${event.type} -> ${subscription.url}`);
        } catch (error) {
          console.error(`Failed to send webhook: ${error.message}`);
        }
      }
    }
  }
}
