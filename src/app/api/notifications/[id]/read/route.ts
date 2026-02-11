/**
 * API Route: /api/notifications/[id]/read
 * Marca notificação como lida
 * 
 * @module api/notifications/[id]/read
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';
import { Result } from '@/shared/domain';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';

import { logger } from '@/shared/infrastructure/logging';
/**
 * POST /api/notifications/[id]/read
 * Marca uma notificação como lida
 */
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const authContext = await getTenantContext();

    const { id } = await context.params;
    const notificationId = parseInt(id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // Resolver NotificationService
    const notificationService = container.resolve(NotificationService);

    // Marcar como lida (com multi-tenancy - REPO-005)
    const result = await notificationService.markAsRead(
      notificationId,
      authContext.userId,
      authContext.organizationId,
      authContext.branchId
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notificação marcada como lida',
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() throws NextResponse on auth failure
    if (error instanceof NextResponse) {
      return error; // Return original 401/403 response
    }
    logger.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
