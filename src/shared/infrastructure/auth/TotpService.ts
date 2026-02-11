/**
 * TotpService - Time-based One-Time Password Service
 *
 * Implements TOTP (RFC 6238) using Node.js native crypto module.
 * Used for 2FA authentication of admin users.
 *
 * Algorithm:
 * 1. Calculate time step: Math.floor(Date.now() / 1000 / 30)
 * 2. Create HMAC-SHA1 of the time step counter using the shared secret
 * 3. Apply dynamic truncation to derive a 6-digit code
 *
 * @module shared/infrastructure/auth
 * @since E11.1
 * @see RFC 6238 - TOTP: Time-Based One-Time Password Algorithm
 * @see RFC 4226 - HOTP: An HMAC-Based One-Time Password Algorithm
 */
import {
  createHmac,
  randomBytes,
  createHash,
  timingSafeEqual as cryptoTimingSafeEqual,
} from 'node:crypto';

/** TOTP configuration constants */
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';
const SECRET_LENGTH = 20; // 20 bytes = 160 bits (RFC 4226 recommended)
const TOTP_WINDOW = 1; // Allow 1 step before/after for clock skew

/**
 * Result of generating a new TOTP secret for a user.
 */
export interface TotpSetupResult {
  /** Base32-encoded shared secret */
  secret: string;
  /** otpauth:// URI for QR code generation */
  otpAuthUrl: string;
  /** Data URL of the QR code (SVG-based, no external dependency) */
  qrCodeDataUrl: string;
}

/**
 * Base32 encoding/decoding utilities (RFC 4648).
 * Used for TOTP secret encoding as per RFC 6238.
 */
class Base32 {
  private static readonly ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * Encodes a Buffer to a Base32 string.
   * @param buffer - The raw bytes to encode
   * @returns Base32-encoded string
   */
  static encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += Base32.ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += Base32.ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes a Base32 string to a Buffer.
   * @param encoded - The Base32-encoded string
   * @returns Decoded raw bytes
   */
  static decode(encoded: string): Buffer {
    const cleanInput = encoded.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    let index = 0;
    const output = Buffer.alloc(Math.ceil((cleanInput.length * 5) / 8));

    for (let i = 0; i < cleanInput.length; i++) {
      const charIndex = Base32.ALPHABET.indexOf(cleanInput[i]);
      if (charIndex === -1) continue;

      value = (value << 5) | charIndex;
      bits += 5;

      if (bits >= 8) {
        output[index++] = (value >>> (bits - 8)) & 0xff;
        bits -= 8;
      }
    }

    return output.subarray(0, index);
  }
}

/**
 * TotpService provides static methods for TOTP-based 2FA.
 *
 * This service is stateless (DOMAIN-SVC-001) and uses only Node.js
 * native crypto (no external dependencies).
 *
 * @example
 * ```typescript
 * // Setup flow
 * const setup = TotpService.generateSecret('user@company.com', 'AuraCore');
 * // Store setup.secret in user record (encrypted)
 * // Show setup.qrCodeDataUrl to user
 *
 * // Verification flow
 * const isValid = TotpService.verifyToken(storedSecret, userProvidedCode);
 * ```
 */
export class TotpService {
  /** @private Prevent instantiation (stateless service) */
  private constructor() {}

  /**
   * Generates a new TOTP secret and returns setup information.
   *
   * @param accountName - User identifier (typically email)
   * @param issuer - Application name shown in authenticator app
   * @returns TotpSetupResult with secret, otpauth URL, and QR code data URL
   */
  static generateSecret(
    accountName: string,
    issuer: string = 'AuraCore'
  ): TotpSetupResult {
    const secretBytes = randomBytes(SECRET_LENGTH);
    const secret = Base32.encode(secretBytes);

    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    const otpAuthUrl =
      `otpauth://totp/${encodedIssuer}:${encodedAccount}` +
      `?secret=${secret}` +
      `&issuer=${encodedIssuer}` +
      `&algorithm=SHA1` +
      `&digits=${TOTP_DIGITS}` +
      `&period=${TOTP_PERIOD}`;

    // Generate a simple SVG-based QR code placeholder URL.
    // In production, the frontend should render the QR code from the otpAuthUrl.
    // We return the otpAuthUrl as the data for client-side QR generation.
    const qrCodeDataUrl = otpAuthUrl;

    return {
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Verifies a TOTP token against a secret.
   *
   * Allows a window of +/- 1 time step to account for clock skew
   * between the server and the authenticator app.
   *
   * @param secret - Base32-encoded secret
   * @param token - 6-digit TOTP token from user
   * @returns true if the token is valid within the time window
   */
  static verifyToken(secret: string, token: string): boolean {
    const trimmedToken = token.trim();
    if (!/^\d{6}$/.test(trimmedToken)) {
      return false;
    }

    const currentTimeStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD);

    // Check current step and +/- TOTP_WINDOW steps for clock skew tolerance
    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      const expectedToken = TotpService.generateTotpCode(secret, currentTimeStep + i);
      if (TotpService.timingSafeEqual(trimmedToken, expectedToken)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates an array of one-time backup codes.
   *
   * Backup codes are used when the user loses access to their
   * authenticator app. Each code can only be used once.
   *
   * @param count - Number of backup codes to generate (default: 10)
   * @returns Array of plaintext backup codes (8 characters each, alphanumeric)
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 4 random bytes and convert to hex (8 chars)
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hashes a backup code for secure storage.
   *
   * Uses SHA-256 to create a one-way hash of the backup code.
   * Only the hashed version should be stored in the database.
   *
   * @param code - Plaintext backup code
   * @returns SHA-256 hex digest of the code
   */
  static hashBackupCode(code: string): string {
    return createHash('sha256')
      .update(code.trim().toUpperCase())
      .digest('hex');
  }

  /**
   * Verifies a backup code against an array of hashed codes.
   *
   * @param code - Plaintext backup code provided by user
   * @param hashedCodes - Array of SHA-256 hashed backup codes from DB
   * @returns true if the code matches any of the hashed codes
   */
  static verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const hashedInput = TotpService.hashBackupCode(code);
    return hashedCodes.some((hashed) =>
      TotpService.timingSafeEqual(hashedInput, hashed)
    );
  }

  /**
   * Removes a used backup code from the hashed array.
   *
   * After a backup code is successfully used, it must be removed
   * to prevent reuse.
   *
   * @param code - Plaintext backup code that was used
   * @param hashedCodes - Array of SHA-256 hashed backup codes
   * @returns New array with the used code removed
   */
  static removeUsedBackupCode(code: string, hashedCodes: string[]): string[] {
    const hashedInput = TotpService.hashBackupCode(code);
    return hashedCodes.filter(
      (hashed) => !TotpService.timingSafeEqual(hashedInput, hashed)
    );
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Generates a TOTP code for a given time step.
   *
   * Implements the TOTP algorithm (RFC 6238):
   * 1. Convert counter to 8-byte big-endian buffer
   * 2. HMAC-SHA1(secret, counter)
   * 3. Dynamic truncation to TOTP_DIGITS digits
   *
   * @param secret - Base32-encoded secret
   * @param timeStep - Integer time step counter
   * @returns Zero-padded TOTP code string
   */
  private static generateTotpCode(secret: string, timeStep: number): string {
    const secretBuffer = Base32.decode(secret);

    // Convert time step to 8-byte big-endian buffer
    const timeBuffer = Buffer.alloc(8);
    let remaining = timeStep;
    for (let i = 7; i >= 0; i--) {
      timeBuffer[i] = remaining & 0xff;
      remaining = Math.floor(remaining / 256);
    }

    // HMAC-SHA1
    const hmac = createHmac(TOTP_ALGORITHM, secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    // Dynamic truncation (RFC 4226 Section 5.4)
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, TOTP_DIGITS);
    return otp.toString().padStart(TOTP_DIGITS, '0');
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   *
   * Uses Node.js native crypto.timingSafeEqual to ensure
   * comparison time is independent of input values.
   *
   * @param a - First string
   * @param b - Second string
   * @returns true if strings are equal
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return cryptoTimingSafeEqual(bufA, bufB);
  }
}
