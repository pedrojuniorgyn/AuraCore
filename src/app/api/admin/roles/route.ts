import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

/**
 * GET /api/admin/roles
 * 🔐 Requer permissão: admin.users.manage
 */
export async function GET(request: NextRequest) {
  return withPermission(request, "admin.users.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const data = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .orderBy(asc(roles.name));

    return NextResponse.json({ success: true, data });
  });
}


