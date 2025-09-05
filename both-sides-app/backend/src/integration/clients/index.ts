/**
 * API Client Framework Index
 * 
 * Central exports for all API client functionality including base client,
 * TimeBack client, configuration management, and utility types.
 */

// ===================================================================
// CORE CLIENT CLASSES
// ===================================================================

export { BaseApiClient } from './base-api-client';
export { TimeBackApiClient, createTimeBackConfig } from './timeback-api-client';
export { ApiClientConfigService } from './api-client-config.service';

// ===================================================================
// INTERFACES AND TYPES
// ===================================================================

export type {
  // Base client types
  ApiClientConfig,
  AuthenticationConfig,
  ApiResponse,
  ApiError,
  RequestContext,
  
} from './base-api-client';

export type {
  // TimeBack client types
  TimeBackConfig,
  TimeBackAuthConfig,
  TimeBackResponse,
  TimeBackUser,
  TimeBackOrganization,
  TimeBackClass,
  TimeBackEnrollment,
  TimeBackWebhookEvent,
  TimeBackQueryParams,
  
} from './timeback-api-client';

export type {
  // Configuration management types
  ClientConfigurationEntry,
  CredentialEntry,
  FeatureFlagConfig,
  ConfigurationValidationResult,
  ConfigurationError,
  ConfigurationWarning,
  ConfigurationSuggestion,
  ConfigurationTemplate,
  
} from './api-client-config.service';

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Create a default API client configuration
 */
export function createDefaultApiClientConfig(baseURL: string): ApiClientConfig {
  return {
    baseURL,
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      retryDelayMultiplier: 2,
    },
    authentication: {
      type: 'none',
    },
    logging: {
      enabled: true,
      logRequests: true,
      logResponses: true,
      logResponseData: false,
      sanitizeHeaders: ['authorization', 'x-api-key', 'cookie'],
      sanitizeRequestData: ['password', 'token', 'secret', 'key'],
      sanitizeResponseData: ['password', 'token', 'secret', 'key'],
    },
  };
}

/**
 * Create OAuth2 authentication configuration
 */
export function createOAuth2Config(
  clientId: string,
  clientSecret: string,
  tokenEndpoint: string,
  scope?: string,
): AuthenticationConfig {
  return {
    type: 'oauth2',
    oauth2: {
      clientId,
      clientSecret,
      tokenEndpoint,
      scope: scope || 'read write',
      grantType: 'client_credentials',
    },
  };
}

/**
 * Create API key authentication configuration
 */
export function createApiKeyConfig(
  apiKey: string,
  headerName?: string,
  queryParam?: string,
): AuthenticationConfig {
  return {
    type: 'api-key',
    apiKey: {
      key: apiKey,
      headerName: headerName || 'X-API-Key',
      queryParam,
    },
  };
}

/**
 * Create bearer token authentication configuration
 */
export function createBearerTokenConfig(
  token: string,
  refreshToken?: string,
  expiresAt?: Date,
): AuthenticationConfig {
  return {
    type: 'bearer',
    bearer: {
      token,
      refreshToken,
      expiresAt,
    },
  };
}

/**
 * Create basic authentication configuration
 */
export function createBasicAuthConfig(
  username: string,
  password: string,
): AuthenticationConfig {
  return {
    type: 'basic',
    basic: {
      username,
      password,
    },
  };
}

/**
 * Validate API response structure
 */
export function isValidApiResponse<T>(response: any): response is ApiResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'status' in response &&
    'statusText' in response &&
    'headers' in response &&
    'requestId' in response &&
    'duration' in response
  );
}

/**
 * Extract error message from API error
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'Unknown API error occurred';
}

/**
 * Check if error is retryable
 */
export function isRetryableApiError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'isRetryable' in error) {
    return Boolean((error as ApiError).isRetryable);
  }
  
  return false;
}

/**
 * Get request ID from API response or error
 */
export function getRequestId(response: ApiResponse<any> | ApiError): string | undefined {
  return response.requestId;
}

/**
 * Create feature flag configuration
 */
export function createFeatureFlagConfig(
  enabledFeatures: string[] = [],
  experimentalFeatures: string[] = [],
  disabledFeatures: string[] = [],
): FeatureFlagConfig {
  return {
    enabledFeatures,
    experimentalFeatures,
    disabledFeatures,
    environmentOverrides: {},
    rolloutPercentage: {},
  };
}

/**
 * Sanitize configuration for logging
 */
export function sanitizeConfigForLogging(config: ApiClientConfig): any {
  const sanitized = { ...config };
  
  // Remove sensitive authentication data
  if (sanitized.authentication) {
    const auth = { ...sanitized.authentication };
    
    if (auth.apiKey?.key) {
      auth.apiKey.key = '[REDACTED]';
    }
    
    if (auth.bearer?.token) {
      auth.bearer.token = '[REDACTED]';
    }
    
    if (auth.bearer?.refreshToken) {
      auth.bearer.refreshToken = '[REDACTED]';
    }
    
    if (auth.oauth2?.clientSecret) {
      auth.oauth2.clientSecret = '[REDACTED]';
    }
    
    if (auth.basic?.password) {
      auth.basic.password = '[REDACTED]';
    }
    
    sanitized.authentication = auth;
  }
  
  return sanitized;
}

/**
 * Calculate retry delay with jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  multiplier: number = 2,
  jitter: boolean = true,
): number {
  let delay = baseDelay * Math.pow(multiplier, attempt);
  
  if (jitter) {
    // Add random jitter of ±25%
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(delay, 100); // Minimum 100ms delay
}

/**
 * Parse query parameters for API requests
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * Merge API client configurations with defaults
 */
export function mergeApiClientConfigs(
  base: ApiClientConfig,
  override: Partial<ApiClientConfig>,
): ApiClientConfig {
  const merged = {
    ...base,
    ...override,
  };
  
  // Deep merge nested objects
  if (base.retryConfig && override.retryConfig) {
    merged.retryConfig = { ...base.retryConfig, ...override.retryConfig };
  }
  
  if (base.authentication && override.authentication) {
    merged.authentication = { ...base.authentication, ...override.authentication };
  }
  
  if (base.logging && override.logging) {
    merged.logging = { ...base.logging, ...override.logging };
  }
  
  if (base.rateLimiting && override.rateLimiting) {
    merged.rateLimiting = { ...base.rateLimiting, ...override.rateLimiting };
  }
  
  return merged;
}

// ===================================================================
// CONSTANTS
// ===================================================================

export const API_CLIENT_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_RETRY_COUNT: 3,
  DEFAULT_RETRY_DELAY: 1000,
  DEFAULT_RETRY_MULTIPLIER: 2,
  MAX_RETRY_DELAY: 30000,
  
  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  },
  
  // Common headers
  HEADERS: {
    AUTHORIZATION: 'Authorization',
    API_KEY: 'X-API-Key',
    REQUEST_ID: 'X-Request-ID',
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    USER_AGENT: 'User-Agent',
  },
  
  // Authentication types
  AUTH_TYPES: {
    NONE: 'none',
    API_KEY: 'api-key',
    BEARER: 'bearer',
    OAUTH2: 'oauth2',
    BASIC: 'basic',
    CUSTOM: 'custom',
  } as const,
  
  // Client types
  CLIENT_TYPES: {
    TIMEBACK: 'timeback',
    GOOGLE_CLASSROOM: 'google-classroom',
    CANVAS: 'canvas',
    BLACKBOARD: 'blackboard',
    CUSTOM: 'custom',
  } as const,
} as const;

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly clientType?: string,
    public readonly requestId?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly configurationId?: string,
    public readonly field?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly authType?: string,
    public readonly credentialsId?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
