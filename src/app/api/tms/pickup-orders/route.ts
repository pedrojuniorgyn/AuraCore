import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pickupOrders } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext, hasAccessToBranch, getBranchScopeFilter } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

/**
 * GET /api/tms/pickup-orders
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    const orders = await db
      .select()
      .from(pickupOrders)
      .where(
        and(
          eq(pickupOrders.organizationId, organizationId),
          isNull(pickupOrders.deletedAt),
          ...getBranchScopeFilter(ctx, pickupOrders.branchId)
        )
      )
      .orderBy(desc(pickupOrders.createdAt));

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error("❌ Erro ao buscar ordens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordens", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tms/pickup-orders
 */
export async function POST(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId || "system";

    const body = await req.json();
    // Evitar override de campos sensíveis via spread
    const {
      organizationId: _orgId,
      branchId: _branchId,
      orderNumber: _orderNumber,
      status: _status,
      createdBy: _createdBy,
      deletedAt: _deletedAt,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // branchId é NOT NULL no schema: usar body.branchId (se vier) ou defaultBranchId da sessão
    const branchIdCandidate = (body as unknown)?.branchId ?? ctx.defaultBranchId;
    if (branchIdCandidate === null || branchIdCandidate === undefined) {
      return NextResponse.json(
        { error: "branchId é obrigatório (ou defina defaultBranchId no usuário)" },
        { status: 400 }
      );
    }
    const branchId = Number(branchIdCandidate);
    if (!Number.isFinite(branchId) || branchId <= 0) {
      return NextResponse.json({ error: "branchId inválido" }, { status: 400 });
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json({ error: "Sem permissão para a filial" }, { status: 403 });
    }

    // Gerar número
    const year = new Date().getFullYear();
    const lastOrders = await db
      .select()
      .from(pickupOrders)
      .where(eq(pickupOrders.organizationId, organizationId))
      .orderBy(desc(pickupOrders.id));

    const orderNumber = `OC-${year}-${String(lastOrders.length + 1).padStart(4, "0")}`;

    const orderData = {
      ...safeBody,
      organizationId,
      branchId,
      orderNumber,
      status: "PENDING_ALLOCATION",
      createdBy,
    } as unknown as typeof pickupOrders.$inferInsert;

    const insertQuery = db
      .insert(pickupOrders)
      .values(orderData);

    const createdId = await insertReturning(insertQuery, { id: pickupOrders.id });
    const orderId = createdId[0]?.id;

    const newOrder = orderId
      ? await queryFirst<typeof pickupOrders.$inferSelect>(
          db
            .select()
            .from(pickupOrders)
            .where(and(eq(pickupOrders.id, Number(orderId)), eq(pickupOrders.organizationId, organizationId), isNull(pickupOrders.deletedAt)))
        )
      : null;

    return NextResponse.json({
      success: true,
      message: "Ordem criada!",
      data: newOrder,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error("❌ Erro ao criar ordem:", error);
    return NextResponse.json(
      { error: "Erro ao criar ordem", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
















