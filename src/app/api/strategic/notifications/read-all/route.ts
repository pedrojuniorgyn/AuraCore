/**
 * API: POST /api/strategic/notifications/read-all
 * Marca todas as notificações como lidas
 *
 * @module app/api/strategic/notifications/read-all
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Implementar persistência no banco de dados
  // await db.update(notifications)
  //   .set({ readAt: new Date() })
  //   .where(and(
  //     eq(notifications.userId, session.user.id),
  //     isNull(notifications.readAt)
  //   ));

  return NextResponse.json({ success: true });
}
