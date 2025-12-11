import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { financialCategories } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/categories
 * 
 * Lista categorias financeiras
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'INCOME' ou 'EXPENSE'

    const conditions: any[] = [
      eq(financialCategories.organizationId, ctx.organizationId),
      isNull(financialCategories.deletedAt),
    ];

    if (type) {
      conditions.push(eq(financialCategories.type, type));
    }

    const categories = await db
      .select()
      .from(financialCategories)
      .where(and(...conditions))
      .orderBy(financialCategories.code);

    return NextResponse.json({ data: categories, total: categories.length });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar categorias:", error);
    return NextResponse.json(
      { error: "Falha ao listar categorias", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial/categories
 * 
 * Cria nova categoria
 */
export async function POST(request: NextRequest) {
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
      .select()
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.organizationId, ctx.organizationId),
          eq(financialCategories.name, body.name)
        )
      )
      .orderBy(financialCategories.id);

    return NextResponse.json({ data: newCategory }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Falha ao criar categoria", details: error.message },
      { status: 500 }
    );
  }
}










