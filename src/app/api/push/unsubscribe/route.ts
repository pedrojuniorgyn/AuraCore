/**
 * API Route: Unsubscribe from Push Notifications
 * Remove subscription do banco de dados
 * 
 * POST /api/push/unsubscribe
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';

export async function POST(request: NextRequest) {
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
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    // TODO: Deletar do banco de dados
    // DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?
    
    console.log('[Push] Unsubscription received:', {
      userId: context.userId,
      endpoint,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted',
    });
  } catch (error) {
    console.error('[Push] Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
