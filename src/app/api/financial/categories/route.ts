import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { financialCategories } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { ensureFinancialData } from "@/lib/services/financial-init";
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

    // 🌱 Seed idempotente: garante categorias padrão no primeiro acesso
    await ensureFinancialData(ctx.organizationId, ctx.userId);

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

    // Mapeia tipo: INCOME → ENTRADA, EXPENSE → SAIDA
    const tipoMovimento = body.type === 'INCOME' ? 'ENTRADA' : 'SAIDA';
    
    // Determina grupo_dfc (padrão: OPERACIONAL)
    let grupoDfc = 'OPERACIONAL';
    const name = (body.name || '').toLowerCase();
    if (name.includes('ativo') || name.includes('imobilizado')) {
      grupoDfc = 'INVESTIMENTO';
    } else if (name.includes('empréstimo') || name.includes('financiamento') || name.includes('lucro')) {
      grupoDfc = 'FINANCIAMENTO';
    }

    await db.insert(financialCategories).values({
      organizationId: ctx.organizationId,
      name: body.name,
      code: body.code || null,
      type: body.type,
      description: body.description || null,
      status: "ACTIVE",
      codigoEstruturado: body.code || null, // ✅ DFC
      tipoMovimento: tipoMovimento, // ✅ DFC
      grupoDfc: grupoDfc, // ✅ DFC
      permiteLancamento: 1, // ✅ DFC
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

















