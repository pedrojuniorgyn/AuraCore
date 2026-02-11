/**
 * TOTP Secret Encryption - AES-256-GCM
 *
 * Encrypts TOTP secrets before storing in database.
 * Required for 2FA security (LC-PR88-001).
 *
 * Format: iv:encrypted:authTag (all hex)
 * Generate key: openssl rand -base64 32
 *
 * @module lib/crypto
 * @since E18
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const keyB64 = process.env.TOTP_ENCRYPTION_KEY;
  if (!keyB64?.trim()) {
    throw new Error(
      'TOTP_ENCRYPTION_KEY is required for 2FA. Generate with: openssl rand -base64 32'
    );
  }
  const key = Buffer.from(keyB64.trim(), 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOTP_ENCRYPTION_KEY must be 32 bytes (base64). Got ${key.length} bytes.`
    );
  }
  return key;
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Output format: ivHex:encryptedHex:authTagHex
 */
export function encryptTotpSecret(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypts TOTP secret.
 * Handles legacy plaintext: if value has no ':', returns as-is (migration pending).
 */
export function decryptTotpSecret(encryptedData: string | null): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty TOTP secret');
  }

  // Legacy plaintext (not yet migrated) - no colons in format
  if (!encryptedData.includes(':') || encryptedData.split(':').length !== 3) {
    return encryptedData;
  }

  const parts = encryptedData.split(':');
  const [ivHex, encryptedHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex!, 'hex');
  const encrypted = Buffer.from(encryptedHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');

  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Constant-time comparison for token auth (metrics, etc).
 * Prevents timing attacks on bearer token validation.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}
