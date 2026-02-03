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

/**
 * GET /api/notifications
 * Lista notificações não lidas do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext();

    // Resolver NotificationService
    const notificationService = container.resolve(NotificationService);

    // Buscar notificações não lidas (converter userId para number)
    const result = await notificationService.getUnreadNotifications(
      parseInt(context.userId, 10),
      context.organizationId
    );

    if (!Result.isOk(result)) {
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
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
