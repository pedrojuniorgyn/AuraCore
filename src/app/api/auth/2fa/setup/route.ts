/**
 * POST /api/auth/2fa/setup
 *
 * Initiates 2FA/TOTP setup for the authenticated user.
 * Generates a TOTP secret, stores it (unverified) on the user record,
 * and returns the otpauth URL (for QR code) plus backup codes.
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Check if 2FA is not already enabled
 * 3. Generate TOTP secret + backup codes
 * 4. Save secret + hashed backup codes to user record
 * 5. Return otpauth URL and plaintext backup codes (shown once)
 *
 * @module api/auth/2fa/setup
 * @since E11.1
 * @security Requires authenticated session
 */
import { NextRequest, NextResponse } from 'next/server';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { withAuth } from '@/lib/auth/api-guard';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TotpService } from '@/shared/infrastructure/auth/TotpService';

export const POST = withDI(async (req: NextRequest) => {
  return withAuth(req, async (_user, ctx) => {
    try {
      // 1. Fetch current user to check 2FA status
      const userRows = await db
        .select({
          id: users.id,
          email: users.email,
          totpEnabled: users.totpEnabled,
          totpSecret: users.totpSecret,
        })
        .from(users)
        .where(eq(users.id, ctx.userId));

      if (userRows.length === 0) {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      const currentUser = userRows[0];

      // 2. Check if 2FA is already enabled
      if (currentUser.totpEnabled) {
        return NextResponse.json(
          {
            error: '2FA já está habilitado para este usuário',
            hint: 'Desabilite o 2FA existente antes de configurar novamente',
          },
          { status: 409 }
        );
      }

      // 3. Generate TOTP secret and backup codes
      const setup = TotpService.generateSecret(
        currentUser.email,
        'AuraCore'
      );
      const backupCodes = TotpService.generateBackupCodes(10);
      const hashedBackupCodes = backupCodes.map((code) =>
        TotpService.hashBackupCode(code)
      );

      // 4. Save secret and hashed backup codes (totp_enabled stays false until verified)
      await db
        .update(users)
        .set({
          totpSecret: setup.secret,
          totpBackupCodes: JSON.stringify(hashedBackupCodes),
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId));

      // 5. Return setup info (backup codes shown ONLY once)
      return NextResponse.json({
        success: true,
        data: {
          otpAuthUrl: setup.otpAuthUrl,
          qrCodeDataUrl: setup.qrCodeDataUrl,
          backupCodes,
        },
        message:
          'Escaneie o QR code com seu app autenticador e guarde os códigos de backup em local seguro. ' +
          'Os códigos de backup serão exibidos apenas uma vez.',
      });
    } catch (error: unknown) {
      if (error instanceof Response) {
        return error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Erro ao configurar 2FA:', error);
      return NextResponse.json(
        { error: 'Erro ao configurar 2FA', details: errorMessage },
        { status: 500 }
      );
    }
  });
});
