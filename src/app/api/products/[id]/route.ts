import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { updateProductSchema } from "@/lib/validators/product";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, ne } from "drizzle-orm";

/**
 * GET /api/products/[id]
 * Busca um produto específico.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Apenas não deletados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // 🔐 SEGURANÇA: Multi-Tenant + Soft Delete
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(products.deletedAt) // 🗑️ NÃO DELETADO
        )
      );

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado ou você não tem permissão para acessá-lo." },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching product:", error);
    return NextResponse.json(
      { error: "Falha ao buscar produto.", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 * Atualiza um produto.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Optimistic Lock: Valida versão
 * - ✅ Auditoria: Registra updated_by
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validação Zod (partial para PUT)
    const parsedBody = updateProductSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { 
          error: "Dados inválidos", 
          errors: parsedBody.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    // Busca produto atual com validações de segurança
    const [currentProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(products.deletedAt)
        )
      );

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado ou você não tem permissão." },
        { status: 404 }
      );
    }

    // 🔒 OPTIMISTIC LOCK: Valida versão (se enviada)
    if (body.version !== undefined && body.version !== currentProduct.version) {
      return NextResponse.json(
        {
          error: "Conflito de versão",
          code: "VERSION_CONFLICT",
          details: "O produto foi alterado por outro usuário. Recarregue a página e tente novamente.",
          currentVersion: currentProduct.version,
          sentVersion: body.version,
        },
        { status: 409 }
      );
    }

    const { sku, version, ...dataToUpdate } = parsedBody.data;

    // Se o SKU for atualizado, verifica duplicidade (excluindo o próprio ID)
    if (sku && sku !== currentProduct.sku) {
      const [duplicateCheck] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            eq(products.sku, sku),
            ne(products.id, id),
            isNull(products.deletedAt)
          )
        );

      if (duplicateCheck) {
        return NextResponse.json(
          { error: "SKU já cadastrado para outro produto nesta organização." },
          { status: 409 }
        );
      }
    }

    // Atualiza com Enterprise Base Pattern
    const updateResult = await db
      .update(products)
      .set({
        ...dataToUpdate,
        ...(sku && { sku }), // Atualiza SKU se fornecido
        updatedBy: ctx.userId, // 📊 AUDITORIA: Quem atualizou
        updatedAt: new Date(),
        version: currentProduct.version + 1, // 🔒 OPTIMISTIC LOCK: Incrementa versão
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId),
          eq(products.version, currentProduct.version) // Double-check de versão
        )
      );

    // Se houve corrida entre SELECT e UPDATE, o UPDATE pode afetar 0 linhas.
    // Precisamos detectar e retornar 409 (em vez de "sucesso" silencioso).
    const rowsAffectedRaw = (updateResult as any)?.rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json(
        {
          error: "Conflito de versão",
          code: "VERSION_CONFLICT",
          details:
            "O produto foi alterado por outro usuário durante a atualização. Recarregue a página e tente novamente.",
          currentVersion: currentProduct.version,
          // version é opcional neste endpoint (compat). Evitar retornar undefined.
          sentVersion: body?.version ?? null,
        },
        { status: 409 }
      );
    }

    // Busca o registro atualizado
    const [updatedProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId)
        )
      );

    if (!updatedProduct) {
      return NextResponse.json(
        { error: "Falha ao atualizar. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error updating product:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar produto.", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Soft Delete de um produto.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Marca deleted_at
 * - ✅ Auditoria: Registra updated_by
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Busca produto atual com validações de segurança
    const [currentProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(products.deletedAt)
        )
      );

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado ou você não tem permissão." },
        { status: 404 }
      );
    }

    // 🗑️ SOFT DELETE: Marca como deletado (não exclui fisicamente)
    await db
      .update(products)
      .set({
        deletedAt: new Date(), // 🗑️ Marca timestamp de exclusão
        updatedBy: ctx.userId, // 📊 AUDITORIA: Quem deletou
        updatedAt: new Date(),
        version: currentProduct.version + 1, // 🔒 Incrementa versão
        status: "INACTIVE", // Muda status para consistência
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId)
        )
      );

    // Retorna o produto deletado (soft delete)
    const [deletedProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organizationId, ctx.organizationId)
        )
      );

    if (!deletedProduct) {
      return NextResponse.json(
        { error: "Falha ao excluir produto." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Produto excluído com sucesso.",
      data: deletedProduct,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error deleting product:", error);
    return NextResponse.json(
      { error: "Falha ao excluir produto.", details: errorMessage },
      { status: 500 }
    );
  }
}



















