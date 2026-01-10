import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
import { BRANCH_COOKIE_NAME } from "@/lib/tenant/branch-cookie";
import { db, ensureConnection } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";

export const runtime = "nodejs";

/**
 * POST /api/tenant/branch
 * Define a filial ativa em cookie (HttpOnly) para o backend/middleware.
 *
 * Body: { branchId: number }
 */
export async function POST(req: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await req.json().catch(() => ({} as unknown));
    const bodyData = body as Record<string, unknown>;
    const branchId = Number(bodyData.branchId);

    if (!Number.isFinite(branchId) || branchId <= 0) {
      return NextResponse.json({ error: "branchId inválido" }, { status: 400 });
    }

    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json({ error: "Forbidden", code: "BRANCH_FORBIDDEN" }, { status: 403 });
    }

    // Valida existência da filial na organização (evita cookie com ID "fantasma")
    const branch = await queryFirst<{ id: number }>(
      db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.id, branchId), eq(branches.organizationId, ctx.organizationId), isNull(branches.deletedAt)))
    );

    if (!branch) {
      return NextResponse.json({ error: "Filial não encontrada" }, { status: 404 });
    }

    const res = NextResponse.json({ success: true, branchId });
    res.cookies.set({
      name: BRANCH_COOKIE_NAME,
      value: String(branchId),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });
    return res;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/tenant/branch
 * Remove a filial ativa do cookie (fallback volta para defaultBranchId).
 */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: BRANCH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}









