/**
 * API Route: Subscribe to Push Notifications
 * Salva subscription no banco de dados
 * 
 * POST /api/push/subscribe
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const POST = withDI(async (request: NextRequest) => {
  try {
    // 1. Validar autenticação
    const context = await getTenantContext();
    if (!context.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await request.json();
    const { subscription, userId } = body;

    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription or userId' },
        { status: 400 }
      );
    }

    // TODO: Salvar no banco de dados
    // Criar tabela: push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, org_id, branch_id, created_at)
    
    // Por enquanto, apenas log
    logger.info('[Push] Subscription received:', {
      userId,
      endpoint: subscription.endpoint,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription saved',
    });
  } catch (error) {
    logger.error('[Push] Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
