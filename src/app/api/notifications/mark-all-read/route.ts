/**
 * API Route: /api/notifications/mark-all-read
 * Marca TODAS as notificações não lidas do usuário como lidas (bulk operation)
 * 
 * Esta rota evita o problema N+1 de marcar cada notificação individualmente,
 * executando uma única query no banco de dados.
 * 
 * @module api/notifications/mark-all-read
 */
import { NextRequest, NextResponse } from 'next/server';
import { container } from 'tsyringe';
import { getTenantContext } from '@/lib/auth/context';
import { NotificationService } from '@/shared/infrastructure/notifications/NotificationService';
import { Result } from '@/shared/domain';

/**
 * POST /api/notifications/mark-all-read
 * Marca todas as notificações não lidas do usuário como lidas
 * 
 * @returns { success: true, count: number } - número de notificações marcadas
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getTenantContext();

    // Resolver NotificationService
    const notificationService = container.resolve(NotificationService);

    // Marcar todas como lidas (com multi-tenancy - REPO-005)
    const result = await notificationService.markAllAsRead(
      authContext.userId,
      authContext.organizationId,
      authContext.branchId
    );

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.value.count,
      message: `${result.value.count} notificações marcadas como lidas`,
    });
  } catch (error) {
    // API-ERR-001: getTenantContext() throws NextResponse on auth failure
    if (error instanceof NextResponse) {
      return error; // Return original 401/403 response
    }
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
