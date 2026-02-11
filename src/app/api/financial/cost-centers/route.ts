import { NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { costCenters } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";
import { z } from "zod";

import { logger } from '@/shared/infrastructure/logging';
// Schemas de validação
const createCostCenterSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["ANALYTIC", "SYNTHETIC"]),
  parentId: z.number().int().positive().optional().nullable(),
  linkedVehicleId: z.coerce.number().int().positive().optional().nullable(),
  ccClass: z.enum(["REVENUE", "EXPENSE", "BOTH"]).optional().default("BOTH"),
});

/**
 * GET /api/financial/cost-centers
 * Lista todos os centros de custo da organização (com hierarquia)
 */
export const GET = withDI(async (req: Request) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    // E9.3: REPO-005 + REPO-006 - Multi-tenancy completo + soft delete
    const allCostCenters = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId), // REPO-005: branchId obrigatório
          isNull(costCenters.deletedAt)
        )
      )
      .orderBy(costCenters.code);

    // Construir árvore hierárquica
    const buildTree = (parentId: number | null = null): Array<Record<string, unknown>> => {
      return allCostCenters
        .filter((cc) => cc.parentId === parentId)
        .map((cc) => ({
          ...cc,
          children: buildTree(cc.id),
        }));
    };

    const tree = buildTree(null);

    return NextResponse.json({
      success: true,
      data: {
        flat: allCostCenters, // Lista plana (para selects)
        tree, // Árvore (para visualização)
      },
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao buscar centros de custo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar centros de custo" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/financial/cost-centers
 * Cria um novo centro de custo
 */
export const POST = withDI(async (req: Request) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const body = await req.json();

    // Validação Zod
    const validation = createCostCenterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code, name, type, parentId, linkedVehicleId, ccClass } = validation.data;

    // E9.3: Verificar duplicação de código com branchId
    const existing = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, ctx.organizationId),
          eq(costCenters.branchId, ctx.branchId), // REPO-005: branchId obrigatório
          eq(costCenters.code, code),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Código já existe" },
        { status: 400 }
      );
    }

    // E9.3: Calcular nível baseado no pai com branchId
    let level = 0;
    if (parentId) {
      const parent = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.id, parentId),
            eq(costCenters.organizationId, ctx.organizationId),
            eq(costCenters.branchId, ctx.branchId), // REPO-005: branchId obrigatório
            isNull(costCenters.deletedAt)
          )
        );

      if (parent.length === 0) {
        return NextResponse.json(
          { error: "Centro de custo pai não encontrado" },
          { status: 404 }
        );
      }

      level = (parent[0].level || 0) + 1;
    }

    // E9.3: REPO-005 - branchId obrigatório no insert
    const costCenterData: typeof costCenters.$inferInsert = {
      organizationId: ctx.organizationId,
      branchId: ctx.branchId, // REPO-005: branchId obrigatório
      code,
      name,
      type,
      parentId: parentId || null,
      level,
      linkedVehicleId: linkedVehicleId || null,
      // ⚠️ Schema usa string "true"/"false". Código downstream deve usar === "true"
      isAnalytical: type === "ANALYTIC" ? "true" : "false",
      class: ccClass, // ✅ REVENUE, EXPENSE, BOTH
      status: "ACTIVE",
      createdBy: ctx.userId,
    };
    
    const insertQuery = db
      .insert(costCenters)
      .values(costCenterData);

    const createdId = await insertReturning(insertQuery, { id: costCenters.id }) as Array<Record<string, unknown>>;
    const newCostCenterId = createdId[0]?.id;

    const newCostCenter = newCostCenterId
      ? await queryFirst<typeof costCenters.$inferSelect>(
          db
            .select()
            .from(costCenters)
            .where(
              and(
                eq(costCenters.id, Number(newCostCenterId)),
                eq(costCenters.organizationId, ctx.organizationId)
              )
            )
        )
      : null;

    return NextResponse.json({
      success: true,
      message: "Centro de custo criado com sucesso!",
      data: newCostCenter,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao criar centro de custo" },
      { status: 500 }
    );
  }
});
