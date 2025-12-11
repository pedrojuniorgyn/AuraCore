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
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const createdBy = session.user.email || "system";

    const body = await req.json();

    // Gerar número
    const year = new Date().getFullYear();
    const lastOrders = await db
      .select()
      .from(pickupOrders)
      .where(eq(pickupOrders.organizationId, organizationId))
      .orderBy(desc(pickupOrders.id));

    const orderNumber = `OC-${year}-${String(lastOrders.length + 1).padStart(4, "0")}`;

    const [newOrder] = await db
      .insert(pickupOrders)
      .values({
        ...body,
        organizationId,
        orderNumber,
        status: "PENDING_ALLOCATION",
        createdBy,
      })
      .returning();

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









