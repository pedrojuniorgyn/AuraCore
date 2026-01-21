/**
 * AuraCore SDK Configuration
 * @module @auracore/sdk/config
 */

import type { AuraCoreConfig, RetryConfig } from './types';

const DEFAULT_BASE_URL = 'https://api.auracore.com.br';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
};

/**
 * Resolve configuration with defaults
 */
export function resolveConfig(
  config: AuraCoreConfig
): Required<AuraCoreConfig> {
  const apiKey = config.apiKey || getEnvApiKey();

  if (!apiKey) {
    throw new Error(
      'API key is required. Pass it to the constructor or set AURACORE_API_KEY environment variable.'
    );
  }

  return {
    apiKey,
    baseUrl: config.baseUrl || getEnvBaseUrl() || DEFAULT_BASE_URL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    headers: config.headers ?? {},
    retry: {
      ...DEFAULT_RETRY,
      ...config.retry,
    },
  };
}

/**
 * Get API key from environment
 */
function getEnvApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env['AURACORE_API_KEY'];
  }
  return undefined;
}

/**
 * Get base URL from environment
 */
function getEnvBaseUrl(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env['AURACORE_BASE_URL'];
  }
  return undefined;
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
  return /^ac_(live|test)_[a-zA-Z0-9]{32,}$/.test(apiKey);
}
