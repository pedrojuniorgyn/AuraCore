import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { createProductSchema } from "@/lib/validators/product";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, or, ilike, desc } from "drizzle-orm";

/**
 * GET /api/products
 * Lista produtos da organização (com filtros e paginação).
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Apenas não deletados
 */
export async function GET(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);

    // Paginação
    const _start = parseInt(searchParams.get("_start") || "0");
    const _end = parseInt(searchParams.get("_end") || "10");
    const limit = _end - _start;

    // Filtros
    const search = searchParams.get("q") || searchParams.get("search");
    
    // Query Base: Multi-Tenant + Soft Delete
    let query = db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(products.deletedAt) // 🗑️ NÃO DELETADO
        )
      )
      .orderBy(desc(products.createdAt));

    // Filtro de Busca (SKU ou Nome)
    if (search) {
      query = db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt),
            or(
              ilike(products.sku, `%${search}%`),
              ilike(products.name, `%${search}%`)
            )
          )
        )
        .orderBy(desc(products.createdAt));
    }

    const allProducts = await query;
    const total = allProducts.length;

    // Aplica paginação manual
    const paginatedProducts = allProducts.slice(_start, _end);

    return NextResponse.json(
      {
        data: paginatedProducts,
        total,
      },
      {
        headers: {
          "Access-Control-Expose-Headers": "X-Total-Count",
          "X-Total-Count": total.toString(),
        },
      }
    );
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching products:", error);
    return NextResponse.json(
      { error: "Falha ao buscar produtos.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Cria um novo produto.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Injeta organization_id automaticamente
 * - ✅ Auditoria: Registra created_by
 * - ✅ Validação: Zod schema + SKU único
 */
export async function POST(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const body = await request.json();

    // Validação Zod
    const parsedBody = createProductSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          errors: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsedBody.data;

    // Verifica duplicidade de SKU (único por organização)
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          eq(products.sku, data.sku),
          isNull(products.deletedAt)
        )
      );

    if (existingProduct) {
      return NextResponse.json(
        { error: "SKU já cadastrado nesta organização." },
        { status: 409 }
      );
    }

    // Insere com Enterprise Base Pattern
    await db.insert(products).values({
      ...data,
      organizationId: ctx.organizationId, // 🔐 MULTI-TENANT
      createdBy: ctx.userId, // 📊 AUDITORIA
      updatedBy: ctx.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    // Busca o produto recém-criado
    const [newProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, ctx.organizationId),
          eq(products.sku, data.sku),
          isNull(products.deletedAt)
        )
      )
      .orderBy(desc(products.id));

    if (!newProduct) {
      return NextResponse.json(
        { error: "Falha ao criar produto." },
        { status: 500 }
      );
    }

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error creating product:", error);
    return NextResponse.json(
      { error: "Falha ao criar produto.", details: error.message },
      { status: 500 }
    );
  }
}















