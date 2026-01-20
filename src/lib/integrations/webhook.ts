/**
 * Generic Webhook Integration Module
 * 
 * Handles sending notifications to custom webhook endpoints.
 * Supports HMAC signature for payload validation.
 */

import { createHmac } from 'crypto';

export interface WebhookPayload {
  event_type: string;
  event_data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  payloadTemplate?: string;
  secretToken?: string;
}

interface SendWebhookOptions {
  config: WebhookConfig;
  eventType: string;
  eventData: Record<string, unknown>;
}

/**
 * Generate HMAC-SHA256 signature for payload validation
 */
export function generateSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Apply template variables to payload
 */
export function applyTemplate(
  template: string,
  eventType: string,
  eventData: Record<string, unknown>,
  timestamp: string
): string {
  return template
    .replace(/\{\{event_type\}\}/g, JSON.stringify(eventType))
    .replace(/\{\{event_data\}\}/g, JSON.stringify(eventData))
    .replace(/\{\{timestamp\}\}/g, JSON.stringify(timestamp));
}

/**
 * Send a notification to a custom webhook endpoint
 */
export async function sendWebhook({ 
  config, 
  eventType, 
  eventData 
}: SendWebhookOptions): Promise<{ success: boolean; error?: string; statusCode?: number; duration?: number }> {
  const startTime = Date.now();
  
  try {
    const timestamp = new Date().toISOString();
    
    // Build payload
    let body: string;
    if (config.payloadTemplate) {
      body = applyTemplate(config.payloadTemplate, eventType, eventData, timestamp);
    } else {
      body = JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        timestamp,
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add signature if secret token is configured
    if (config.secretToken) {
      const signature = generateSignature(body, config.secretToken);
      headers['X-Signature-256'] = `sha256=${signature}`;
    }

    // Send request
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body,
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const text = await response.text();
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${text}`,
        statusCode: response.status,
        duration,
      };
    }

    return { 
      success: true, 
      statusCode: response.status,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Validate incoming webhook request signature
 */
export function validateSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = `sha256=${generateSignature(payload, secret)}`;
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}
