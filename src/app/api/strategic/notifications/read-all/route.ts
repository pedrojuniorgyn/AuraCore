/**
 * API: POST /api/strategic/notifications/read-all
 * Marca todas as notificações como lidas
 *
 * @module app/api/strategic/notifications/read-all
 */
import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { withDI } from '@/shared/infrastructure/di/with-di';

export const POST = withDI(async () => {
  // Validar autenticacao e tenant context
  await getTenantContext();

  // TODO: Implementar persistência no banco de dados
  // const ctx = await getTenantContext();
  // await db.update(notifications)
  //   .set({ readAt: new Date() })
  //   .where(and(
  //     eq(notifications.userId, ctx.userId),
  //     isNull(notifications.readAt)
  //   ));

  return NextResponse.json({ success: true });
});
