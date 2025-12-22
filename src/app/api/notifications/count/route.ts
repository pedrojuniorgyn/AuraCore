import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

/**
 * GET /api/notifications/count
 * Contar notificações não lidas
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const result = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, ctx.organizationId),
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, sql`0`)
        )
      );

    const count = result[0]?.count || 0;

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("Error counting notifications:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

