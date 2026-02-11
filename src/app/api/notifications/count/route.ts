import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
/**
 * GET /api/notifications/count
 * Contar notificações não lidas
 */
export const GET = withDI(async (request: NextRequest) => {
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
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error counting notifications:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});

