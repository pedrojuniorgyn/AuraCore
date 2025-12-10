import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * GET /api/notifications
 * Listar notificações do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    // SQL Server não suporta .limit(), usar TOP
    const userId = parseInt(session.user.id);
    
    let query = `
      SELECT TOP ${limit} *
      FROM notifications
      WHERE user_id = '${userId}'
    `;
    
    if (unreadOnly) {
      query += ` AND is_read = 0`;
    }
    
    query += ` ORDER BY created_at DESC`;

    const results = await db.execute(sql.raw(query)) as any[];
    const resultsArray = Array.isArray(results) ? results : [];

    // Parse JSON data
    const parsed = resultsArray.map((notif) => ({
      id: notif.id,
      organizationId: notif.organization_id,
      branchId: notif.branch_id,
      userId: notif.user_id,
      type: notif.type,
      event: notif.event,
      title: notif.title,
      message: notif.message,
      data: notif.data ? JSON.parse(notif.data) : null,
      actionUrl: notif.action_url,
      isRead: notif.is_read,
      readAt: notif.read_at,
      createdAt: notif.created_at,
    }));

    return NextResponse.json(parsed);
  } catch (error: any) {
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    const userId = parseInt(session.user.id);

    if (markAll) {
      // Marcar todas como lidas
      await db
        .update(notifications)
        .set({
          isRead: sql`1`,
          readAt: sql`GETDATE()`,
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, sql`0`)
          )
        );

      return NextResponse.json({ success: true, message: "All marked as read" });
    } else if (notificationId) {
      // Marcar uma como lida
      await db
        .update(notifications)
        .set({
          isRead: sql`1`,
          readAt: sql`GETDATE()`,
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "notificationId or markAll required" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

