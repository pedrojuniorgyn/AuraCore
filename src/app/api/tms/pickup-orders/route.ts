import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pickupOrders } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";

/**
 * GET /api/tms/pickup-orders
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const orders = await db
      .select()
      .from(pickupOrders)
      .where(
        and(
          eq(pickupOrders.organizationId, organizationId),
          isNull(pickupOrders.deletedAt)
        )
      )
      .orderBy(desc(pickupOrders.createdAt));

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar ordens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordens", details: error.message },
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
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const createdBy = session.user.email || "system";

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
    const sessionDefaultBranchId =
      Number((session.user as any)?.defaultBranchId ?? (session.user as any)?.branchId ?? 0) || null;
    const branchIdRaw = (body as any)?.branchId ?? sessionDefaultBranchId;
    const branchId = branchIdRaw ? Number(branchIdRaw) : NaN;
    if (!branchId || Number.isNaN(branchId)) {
      return NextResponse.json(
        { error: "branchId é obrigatório (ou defina defaultBranchId no usuário)" },
        { status: 400 }
      );
    }

    // Gerar número
    const year = new Date().getFullYear();
    const lastOrders = await db
      .select()
      .from(pickupOrders)
      .where(eq(pickupOrders.organizationId, organizationId))
      .orderBy(desc(pickupOrders.id));

    const orderNumber = `OC-${year}-${String(lastOrders.length + 1).padStart(4, "0")}`;

    const [createdId] = await db
      .insert(pickupOrders)
      .values({
        ...safeBody,
        organizationId,
        branchId,
        orderNumber,
        status: "PENDING_ALLOCATION",
        createdBy,
      })
      .$returningId();

    const orderId = (createdId as any)?.id;
    const [newOrder] = orderId
      ? await db
          .select()
          .from(pickupOrders)
          .where(and(eq(pickupOrders.id, Number(orderId)), eq(pickupOrders.organizationId, organizationId), isNull(pickupOrders.deletedAt)))
          .limit(1)
      : [];

    return NextResponse.json({
      success: true,
      message: "Ordem criada!",
      data: newOrder,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar ordem:", error);
    return NextResponse.json(
      { error: "Erro ao criar ordem", details: error.message },
      { status: 500 }
    );
  }
}
















