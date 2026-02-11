import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { pickupOrders } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext, hasAccessToBranch, getBranchScopeFilter } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";
import { createPickupOrderSchema } from "@/lib/validation/tms-schemas";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
// ✅ S1.1 Batch 3: Schema de query para pickup orders
const queryPickupOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

/**
 * GET /api/tms/pickup-orders
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod query params
 */
export const GET = withDI(async (req: Request) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    // ✅ S1.1 Batch 3: Validar query params
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validation = queryPickupOrdersSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { page, pageSize, status, customerId, startDate, endDate } = validation.data;

    // ✅ Construir condições dinamicamente (aplicar filtros!)
    const conditions = [
      eq(pickupOrders.organizationId, organizationId),
      isNull(pickupOrders.deletedAt),
      ...getBranchScopeFilter(ctx, pickupOrders.branchId)
    ];
    
    if (status) conditions.push(eq(pickupOrders.status, status));
    if (customerId) conditions.push(eq(pickupOrders.customerId, customerId));
    // TODO: Aplicar startDate, endDate se campos existirem no schema

    const orders = await db
      .select()
      .from(pickupOrders)
      .where(and(...conditions))
      .orderBy(desc(pickupOrders.createdAt));

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error("❌ Erro ao buscar ordens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordens", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});

/**
 * POST /api/tms/pickup-orders
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod schema
 */
export const POST = withDI(async (req: Request) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId || "system";

    const body = await req.json();
    
    // ✅ S1.1 Batch 3: Validar body com Zod
    const validation = createPickupOrderSchema.safeParse({
      ...body,
      organizationId,
      branchId: body.branchId ?? ctx.defaultBranchId,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const validatedData = validation.data;
    const branchId = validatedData.branchId;
    
    // Verificar acesso à filial
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json({ error: "Sem permissão para a filial" }, { status: 403 });
    }
    
    // Evitar override de campos sensíveis via spread
    const {
      organizationId: _orgId,
      branchId: _branchId,
      ...safeBody
    } = body as Record<string, unknown>;

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

    const createdId = await insertReturning(insertQuery, { id: pickupOrders.id }) as Array<Record<string, unknown>>;
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
    logger.error("❌ Erro ao criar ordem:", error);
    return NextResponse.json(
      { error: "Erro ao criar ordem", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});
















