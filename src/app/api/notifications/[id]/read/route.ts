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

/**
 * POST /api/notifications/[id]/read
 * Marca uma notificação como lida
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const authContext = await getTenantContext();

    const { id } = await context.params;
    const notificationId = parseInt(id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    // Resolver NotificationService
    const notificationService = container.resolve(NotificationService);

    // Marcar como lida
    const result = await notificationService.markAsRead(notificationId);

    if (!Result.isOk(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notificação marcada como lida',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
