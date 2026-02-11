/**
 * API: /api/strategic/notifications
 * CRUD para notificações do usuário
 *
 * @module app/api/strategic/notifications
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import type { NotificationsListResponse } from '@/lib/notifications/notification-types';
import { getNotifications, clearNotifications } from '@/lib/notifications/notification-store';
import { withDI } from '@/shared/infrastructure/di/with-di';

export const GET = withDI(async (request: NextRequest) => {
  const ctx = await getTenantContext();
  const userId = ctx.userId;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  // Get notifications from store
  let notifications = getNotifications(userId);

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
});

export const DELETE = withDI(async () => {
  const ctx = await getTenantContext();
  const userId = ctx.userId;

  clearNotifications(userId);

  return NextResponse.json({ success: true });
});
