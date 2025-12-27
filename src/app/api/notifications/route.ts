import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

/**
 * GET /api/notifications
 * Listar notificações do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limitParam = Number(searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 200)
      : 50;

    const resultsArray = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, ctx.organizationId),
          eq(notifications.userId, ctx.userId),
          ...(unreadOnly ? [eq(notifications.isRead, 0)] : [])
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Parse JSON data
    const parsed = resultsArray.map((notif) => ({
      id: notif.id,
      organizationId: notif.organizationId,
      branchId: notif.branchId,
      userId: notif.userId,
      type: notif.type,
      event: notif.event,
      title: notif.title,
      message: notif.message,
      data: notif.data ? JSON.parse(String(notif.data)) : null,
      actionUrl: notif.actionUrl,
      isRead: notif.isRead,
      readAt: notif.readAt,
      createdAt: notif.createdAt,
    }));

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/mark-read
 * Marcar notificação como lida
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Marcar todas como lidas
      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.organizationId, ctx.organizationId),
            eq(notifications.userId, ctx.userId),
            eq(notifications.isRead, 0)
          )
        );

      return NextResponse.json({ success: true, message: "All marked as read" });
    } else if (notificationId) {
      // Marcar uma como lida
      await db
        .update(notifications)
        .set({
          isRead: 1,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.organizationId, ctx.organizationId),
            eq(notifications.userId, ctx.userId)
          )
        );

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "notificationId or markAll required" },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

