/**
 * Migration: Encrypt existing plaintext TOTP secrets
 *
 * Run after deploying TOTP encryption. Converts legacy plaintext secrets
 * to AES-256-GCM encrypted format.
 *
 * Usage: npx tsx scripts/encrypt-totp-secrets.ts
 *
 * Requires: TOTP_ENCRYPTION_KEY in .env (openssl rand -base64 32)
 *
 * @module scripts/encrypt-totp-secrets
 * @since E18
 */
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

// Use relative imports for scripts (tsx runs from project root)
import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import { encryptTotpSecret } from '../src/lib/crypto';
import { eq, isNotNull } from 'drizzle-orm';

async function encryptExistingSecrets() {
  console.log('🔐 Encrypting existing TOTP secrets...');

  const usersWithTotp = await db
    .select({ id: users.id, email: users.email, totpSecret: users.totpSecret })
    .from(users)
    .where(isNotNull(users.totpSecret));

  console.log(`Found ${usersWithTotp.length} users with 2FA enabled`);

  for (const user of usersWithTotp) {
    const secret = user.totpSecret;
    if (!secret) continue;

    // Already encrypted (contains colons in iv:encrypted:authTag format)
    if (secret.includes(':') && secret.split(':').length === 3) {
      console.log(`✓ User ${user.email} already encrypted, skipping`);
      continue;
    }

    const encrypted = encryptTotpSecret(secret);

    await db
      .update(users)
      .set({ totpSecret: encrypted, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    console.log(`✓ Encrypted secret for ${user.email}`);
  }

  console.log('✅ Migration complete!');
}

encryptExistingSecrets().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
