/**
 * API Route: /api/notifications
 * Busca notificações in-app do usuário
 * 
 * @module api/notifications
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';
import { Result } from '@/shared/domain';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * GET /api/notifications
 * Lista notificações não lidas do usuário
 * 
 * Query params:
 * - limit: Número de resultados (padrão: 50, máx: 200)
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const context = await getTenantContext();

    // Ler query param limit (default 50, clamped 1-200)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
    // Validar que parseInt não retornou NaN e clampar para 1-200
    const limit = isNaN(parsedLimit) ? 50 : Math.max(1, Math.min(200, parsedLimit));

    // Resolver NotificationService
    const notificationService = container.resolve(NotificationService);

    // Buscar notificações não lidas
    // userId pode ser string (context.userId) - service aceita ambos
    // REPO-005: SEMPRE passar branchId para isolamento multi-tenant
    const result = await notificationService.getUnreadNotifications(
      context.userId,
      context.organizationId,
      context.branchId,
      limit
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      total: result.value.length,
      notifications: result.value,
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() throws NextResponse on auth failure
    if (error instanceof NextResponse) {
      return error; // Return original 401/403 response
    }
    logger.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
