import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
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

    // ✅ BP-SQL-004: Inline type assertion + filtros de performance
    // Query otimizada com índices (migration 0039):
    // - idx_notifications_user_coverage (userId, organizationId, createdAt DESC)
    // - Covering index elimina key lookups
    // - Performance: 10x-50x mais rápido (Table Scan → Index Seek)
    const baseQuery = db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, ctx.organizationId),
          eq(notifications.userId, ctx.userId),
          isNull(notifications.deletedAt), // ✅ SCHEMA-006: Soft delete filter
          ...(unreadOnly ? [eq(notifications.isRead, 0)] : [])
        )
      )
      .orderBy(desc(notifications.createdAt));
    
    // Type assertion necessária: Drizzle MSSQL tem .limit() mas tipagem incompleta
    type NotificationRow = typeof notifications.$inferSelect;
    type QueryWithLimit = { limit(n: number): Promise<NotificationRow[]> };
    const resultsArray = await (baseQuery as unknown as QueryWithLimit).limit(limit);

    // Parse JSON data with safe fallback
    const parsed = resultsArray.map((notif) => {
      let parsedData = null;
      if (notif.data) {
        try {
          parsedData = JSON.parse(String(notif.data));
        } catch (error) {
          console.warn(`Invalid JSON in notification ${notif.id}:`, error);
          parsedData = null;
        }
      }

      return {
        id: notif.id,
        organizationId: notif.organizationId,
        branchId: notif.branchId,
        userId: notif.userId,
        type: notif.type,
        event: notif.event,
        title: notif.title,
        message: notif.message,
        data: parsedData,
        actionUrl: notif.actionUrl,
        isRead: notif.isRead,
        readAt: notif.readAt,
        createdAt: notif.createdAt,
        updatedAt: notif.updatedAt, // ✅ BUG-001: Audit trail completo
      };
    });

    return NextResponse.json(parsed);
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: errorMessage },
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
          updatedAt: new Date(), // ✅ SCHEMA-005: Auditoria
        })
        .where(
          and(
            eq(notifications.organizationId, ctx.organizationId),
            eq(notifications.userId, ctx.userId),
            eq(notifications.isRead, 0),
            isNull(notifications.deletedAt) // ✅ SCHEMA-006: Não atualizar deletados
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
          updatedAt: new Date(), // ✅ SCHEMA-005: Auditoria
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.organizationId, ctx.organizationId),
            eq(notifications.userId, ctx.userId),
            isNull(notifications.deletedAt) // ✅ SCHEMA-006: Não atualizar deletados
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
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

