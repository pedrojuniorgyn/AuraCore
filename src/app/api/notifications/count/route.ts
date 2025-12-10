import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * GET /api/notifications/count
 * Contar notificações não lidas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const result = await db
      .select({ count: sql<number>`CAST(COUNT(*) AS INT)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
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

