import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { db, ensureConnection } from "@/lib/db";
import { financialCategories } from "@/modules/financial/infrastructure/persistence/schemas";
import { getTenantContext } from "@/lib/auth/context";
import { ensureFinancialData } from "@/lib/services/financial-init";
import { eq, and, isNull } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
/**
 * GET /api/financial/categories
 * 
 * Lista categorias financeiras
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'INCOME' ou 'EXPENSE'

    // 🌱 Seed idempotente: garante categorias padrão no primeiro acesso
    await ensureFinancialData(ctx.organizationId, ctx.userId);

    // ✅ Seleciona apenas colunas "core" para evitar quebra caso o banco ainda não tenha
    // colunas novas que existam no schema Drizzle.
    const categorySelect = {
      id: financialCategories.id,
      organizationId: financialCategories.organizationId,
      name: financialCategories.name,
      code: financialCategories.code,
      type: financialCategories.type,
      description: financialCategories.description,
      status: financialCategories.status,
      createdBy: financialCategories.createdBy,
      updatedBy: financialCategories.updatedBy,
      createdAt: financialCategories.createdAt,
      updatedAt: financialCategories.updatedAt,
      deletedAt: financialCategories.deletedAt,
      version: financialCategories.version,
    };

    const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof isNull>> = [
      eq(financialCategories.organizationId, ctx.organizationId),
      isNull(financialCategories.deletedAt),
    ];

    if (type) {
      conditions.push(eq(financialCategories.type, type));
    }

    const categories = await db
      .select(categorySelect)
      .from(financialCategories)
      .where(and(...conditions))
      .orderBy(financialCategories.code);

    return NextResponse.json({ data: categories, total: categories.length });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao listar categorias:", error);
    return NextResponse.json(
      { error: "Falha ao listar categorias", details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/financial/categories
 * 
 * Cria nova categoria
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    await db.insert(financialCategories).values({
      organizationId: ctx.organizationId,
      name: body.name,
      code: body.code || null,
      type: body.type,
      description: body.description || null,
      status: "ACTIVE",
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      version: 1,
    });

    // Busca o registro criado
    const [newCategory] = await db
      .select({
        id: financialCategories.id,
        organizationId: financialCategories.organizationId,
        name: financialCategories.name,
        code: financialCategories.code,
        type: financialCategories.type,
        description: financialCategories.description,
        status: financialCategories.status,
        createdBy: financialCategories.createdBy,
        updatedBy: financialCategories.updatedBy,
        createdAt: financialCategories.createdAt,
        updatedAt: financialCategories.updatedAt,
        deletedAt: financialCategories.deletedAt,
        version: financialCategories.version,
      })
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.organizationId, ctx.organizationId),
          eq(financialCategories.name, body.name)
        )
      )
      .orderBy(financialCategories.id);

    return NextResponse.json({ data: newCategory }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Falha ao criar categoria", details: errorMessage },
      { status: 500 }
    );
  }
});

















