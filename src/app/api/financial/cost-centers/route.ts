import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costCenters } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

/**
 * GET /api/financial/cost-centers
 * Lista todos os centros de custo da organização (com hierarquia)
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    // Buscar todos os centros de custo
    const allCostCenters = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, ctx.organizationId),
          isNull(costCenters.deletedAt)
        )
      )
      .orderBy(costCenters.code);

    // Construir árvore hierárquica
    const buildTree = (parentId: number | null = null): any[] => {
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
    console.error("❌ Erro ao buscar centros de custo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar centros de custo" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/cost-centers
 * Cria um novo centro de custo
 */
export async function POST(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const body = await req.json();
    const { code, name, type, parentId, linkedVehicleId, ccClass } = body;

    // Validações
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "Código, nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    if (!["ANALYTIC", "SYNTHETIC"].includes(type)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use ANALYTIC ou SYNTHETIC" },
        { status: 400 }
      );
    }

    // Verificar duplicação de código
    const existing = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, ctx.organizationId),
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

    // Calcular nível baseado no pai
    let level = 0;
    if (parentId) {
      const parent = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.id, parentId),
            eq(costCenters.organizationId, ctx.organizationId),
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

    // Criar
    const costCenterData: typeof costCenters.$inferInsert = {
      organizationId: ctx.organizationId,
      code,
      name,
      type,
      parentId: parentId || null,
      level,
      linkedVehicleId: linkedVehicleId || null,
      // ⚠️ Schema usa string "true"/"false". Código downstream deve usar === "true"
      isAnalytical: type === "ANALYTIC" ? "true" : "false",
      class: ccClass || "BOTH", // ✅ REVENUE, EXPENSE, BOTH
      status: "ACTIVE",
      createdBy: ctx.userId,
    };
    
    const insertQuery = db
      .insert(costCenters)
      .values(costCenterData);

    const createdId = await insertReturning(insertQuery, { id: costCenters.id });
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
    console.error("❌ Erro ao criar centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao criar centro de custo" },
      { status: 500 }
    );
  }
}




