/**
 * API: /api/strategic/notifications
 * CRUD para notificações do usuário
 *
 * @module app/api/strategic/notifications
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Notification, NotificationsListResponse } from '@/lib/notifications/notification-types';

// Mock storage - em produção usar banco de dados
const notificationsStore = new Map<string, Notification[]>();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  // Get notifications from store
  let notifications = notificationsStore.get(userId) || [];

  if (unreadOnly) {
    notifications = notifications.filter((n) => !n.readAt);
  }

  const total = notifications.length;
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Paginate
  const start = (page - 1) * pageSize;
  const paginatedNotifications = notifications.slice(start, start + pageSize);

  const response: NotificationsListResponse = {
    notifications: paginatedNotifications,
    total,
    unreadCount,
  };

  return NextResponse.json(response);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  notificationsStore.delete(userId);

  return NextResponse.json({ success: true });
}

// Helper to add notification (for internal use)
export function addNotificationToStore(userId: string, notification: Notification): void {
  const existing = notificationsStore.get(userId) || [];
  notificationsStore.set(userId, [notification, ...existing].slice(0, 100));
}
