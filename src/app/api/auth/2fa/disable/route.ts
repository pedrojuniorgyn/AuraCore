/**
 * POST /api/auth/2fa/disable
 *
 * Disables 2FA/TOTP for the authenticated user.
 * Requires admin role AND a valid TOTP token for re-verification
 * (security: prevent unauthorized disabling if session is hijacked).
 *
 * Flow:
 * 1. Verify user is authenticated and has ADMIN role
 * 2. Validate input (6-digit TOTP token)
 * 3. Verify token to confirm identity
 * 4. Clear TOTP fields and disable 2FA
 *
 * @module api/auth/2fa/disable
 * @since E11.1
 * @security Requires authenticated session + ADMIN role + valid TOTP token
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
 * Zod schema for 2FA disable input.
 * Requires current TOTP token for re-verification before disabling.
 */
const Disable2faSchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, 'Token deve ter exatamente 6 dígitos')
    .regex(/^\d{6}$/, 'Token deve conter apenas números'),
});

export const POST = withDI(async (req: NextRequest) => {
  return withAuth(req, async (_user, ctx) => {
    try {
      // 1. Verify admin role (GAP-SEC-003: 2FA management requires ADMIN)
      if (!ctx.isAdmin) {
        return NextResponse.json(
          {
            error: 'Acesso negado',
            message: 'Apenas administradores podem desabilitar 2FA',
          },
          { status: 403 }
        );
      }

      // 2. Validate input with Zod
      const body: unknown = await req.json();
      const validation = Disable2faSchema.safeParse(body);

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

      // 3. Fetch user's TOTP data
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

      if (!currentUser.totpEnabled || !currentUser.totpSecret) {
        return NextResponse.json(
          {
            error: '2FA não está habilitado para este usuário',
          },
          { status: 400 }
        );
      }

      // 4. Verify TOTP token (re-authentication before disabling; decrypt if encrypted)
      const secret = decryptTotpSecret(currentUser.totpSecret);
      const isValid = TotpService.verifyToken(secret, token);

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Token inválido',
            hint: 'Forneça um token válido do seu app autenticador para confirmar a desativação',
          },
          { status: 401 }
        );
      }

      // 5. Disable 2FA - clear all TOTP fields
      await db
        .update(users)
        .set({
          totpEnabled: false,
          totpSecret: null,
          totpBackupCodes: null,
          totpVerifiedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId));

      return NextResponse.json({
        success: true,
        message: '2FA desabilitado com sucesso. Recomendamos reativar o 2FA o mais breve possível para manter sua conta segura.',
        data: {
          totpEnabled: false,
          disabledAt: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof Response) {
        return error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('❌ Erro ao desabilitar 2FA:', error);
      return NextResponse.json(
        { error: 'Erro ao desabilitar 2FA', details: errorMessage },
        { status: 500 }
      );
    }
  });
});
