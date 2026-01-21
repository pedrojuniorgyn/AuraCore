/**
 * AuraCore SDK Errors
 * @module @auracore/sdk/errors
 */

import type { APIError } from './types';

/**
 * Base error class for AuraCore SDK
 */
export class AuraCoreError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuraCoreError';
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static fromAPIError(error: APIError): AuraCoreError {
    const factory = ERROR_FACTORIES[error.status];
    if (factory) {
      return factory(error.message, error.details);
    }
    return new AuraCoreError(
      error.message,
      error.code,
      error.status,
      error.details
    );
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AuraCoreError {
  constructor(
    message: string = 'Invalid API key',
    details?: Record<string, unknown>
  ) {
    super(message, 'authentication_error', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AuraCoreError {
  constructor(
    message: string = 'Permission denied',
    details?: Record<string, unknown>
  ) {
    super(message, 'authorization_error', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AuraCoreError {
  constructor(
    message: string = 'Resource not found',
    details?: Record<string, unknown>
  ) {
    super(message, 'not_found', 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error (400, 422)
 */
export class ValidationError extends AuraCoreError {
  constructor(
    message: string = 'Validation failed',
    details?: Record<string, unknown>
  ) {
    super(message, 'validation_error', 422, details);
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AuraCoreError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'rate_limit_exceeded', 429, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Server error (5xx)
 */
export class ServerError extends AuraCoreError {
  constructor(
    message: string = 'Internal server error',
    status: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message, 'server_error', status, details);
    this.name = 'ServerError';
  }
}

/**
 * Network/connection error
 */
export class NetworkError extends AuraCoreError {
  constructor(
    message: string = 'Network error',
    details?: Record<string, unknown>
  ) {
    super(message, 'network_error', 0, details);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AuraCoreError {
  constructor(
    message: string = 'Request timeout',
    details?: Record<string, unknown>
  ) {
    super(message, 'timeout', 408, details);
    this.name = 'TimeoutError';
  }
}

// Error factory type
type ErrorFactory = (
  message: string,
  details?: Record<string, unknown>
) => AuraCoreError;

// Error factories by status code
const ERROR_FACTORIES: Record<number, ErrorFactory> = {
  400: (msg, details) => new ValidationError(msg, details),
  401: (msg, details) => new AuthenticationError(msg, details),
  403: (msg, details) => new AuthorizationError(msg, details),
  404: (msg, details) => new NotFoundError(msg, details),
  408: (msg, details) => new TimeoutError(msg, details),
  422: (msg, details) => new ValidationError(msg, details),
  429: (msg, details) => new RateLimitError(msg, undefined, details),
  500: (msg, details) => new ServerError(msg, 500, details),
  502: (msg, details) => new ServerError(msg, 502, details),
  503: (msg, details) => new ServerError(msg, 503, details),
  504: (msg, details) => new ServerError(msg, 504, details),
};
