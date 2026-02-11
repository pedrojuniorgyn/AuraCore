/**
 * POST /api/auth/2fa/verify
 *
 * Verifies a TOTP token to complete 2FA setup or authenticate.
 * After successful verification during setup, enables 2FA on the user account.
 *
 * Flow:
 * 1. Validate input (6-digit token)
 * 2. Fetch user's TOTP secret
 * 3. Verify the token against the secret
 * 4. If valid and 2FA not yet enabled, enable it (set totp_enabled = true)
 * 5. Return success/failure
 *
 * @module api/auth/2fa/verify
 * @since E11.1
 * @security Requires authenticated session
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withDI } from '@/shared/infrastructure/di/with-di';
import { withAuth } from '@/lib/auth/api-guard';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TotpService } from '@/shared/infrastructure/auth/TotpService';
import { decryptTotpSecret } from '@/lib/crypto';
import { logger } from '@/shared/infrastructure/logging';
/**
 * Zod schema for 2FA verification input.
 * Accepts a 6-digit numeric token string.
 */
const Verify2faSchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, 'Token deve ter exatamente 6 dígitos')
    .regex(/^\d{6}$/, 'Token deve conter apenas números'),
});

export const POST = withDI(async (req: NextRequest) => {
  return withAuth(req, async (_user, ctx) => {
    try {
      // 1. Validate input with Zod
      const body: unknown = await req.json();
      const validation = Verify2faSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Dados inválidos',
            details: validation.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { token } = validation.data;

      // 2. Fetch user's TOTP secret
      const userRows = await db
        .select({
          id: users.id,
          totpSecret: users.totpSecret,
          totpEnabled: users.totpEnabled,
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

      if (!currentUser.totpSecret) {
        return NextResponse.json(
          {
            error: '2FA não configurado',
            hint: 'Execute POST /api/auth/2fa/setup antes de verificar',
          },
          { status: 400 }
        );
      }

      // 3. Verify TOTP token (decrypt secret if encrypted)
      const secret = decryptTotpSecret(currentUser.totpSecret);
      const isValid = TotpService.verifyToken(secret, token);

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Token inválido',
            hint: 'Verifique o código no seu app autenticador e tente novamente',
          },
          { status: 401 }
        );
      }

      // 4. If 2FA not yet enabled, enable it now (completing setup)
      if (!currentUser.totpEnabled) {
        await db
          .update(users)
          .set({
            totpEnabled: true,
            totpVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.userId));

        return NextResponse.json({
          success: true,
          message: '2FA habilitado com sucesso! Sua conta agora está protegida com autenticação em dois fatores.',
          data: {
            totpEnabled: true,
            verifiedAt: new Date().toISOString(),
          },
        });
      }

      // 5. Already enabled - this is a regular verification (e.g., for sensitive actions)
      return NextResponse.json({
        success: true,
        message: 'Token verificado com sucesso',
        data: {
          verified: true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Response) {
        return error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('❌ Erro ao verificar 2FA:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar 2FA', details: errorMessage },
        { status: 500 }
      );
    }
  });
});
