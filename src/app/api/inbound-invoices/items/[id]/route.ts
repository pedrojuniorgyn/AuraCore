import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboundInvoiceItems, products } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";

/**
 * PATCH /api/inbound-invoices/items/[id]
 * 
 * Vincula um item da NFe a um produto.
 * 
 * Modos de operação:
 * 1. Link to Existing: { product_id: number }
 * 2. Create & Link: { create_new: true, product_data: {...} }
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Busca o item
    const [item] = await db
      .select()
      .from(inboundInvoiceItems)
      .where(eq(inboundInvoiceItems.id, itemId));

    if (!item) {
      return NextResponse.json(
        { error: "Item não encontrado" },
        { status: 404 }
      );
    }

    // 🔗 MODO 1: Vincular a Produto Existente
    if (body.product_id) {
      const productId = parseInt(body.product_id);

      // Valida que o produto pertence à organização
      const [product] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt)
          )
        );

      if (!product) {
        return NextResponse.json(
          { error: "Produto não encontrado ou você não tem permissão" },
          { status: 404 }
        );
      }

      // Atualiza o item com o vínculo
      await db
        .update(inboundInvoiceItems)
        .set({
          productId,
        })
        .where(eq(inboundInvoiceItems.id, itemId));

      console.log(`✅ Item ${itemId} vinculado ao produto ${productId} (${product.name})`);

      return NextResponse.json({
        success: true,
        message: "Produto vinculado com sucesso!",
        data: {
          itemId,
          productId,
          productName: product.name,
        },
      });
    }

    // 🆕 MODO 2: Criar Novo Produto e Vincular
    if (body.create_new && body.product_data) {
      const productData = body.product_data;

      // Validação básica
      if (!productData.sku || !productData.name || !productData.ncm) {
        return NextResponse.json(
          { error: "Dados insuficientes para criar produto (sku, name, ncm obrigatórios)" },
          { status: 400 }
        );
      }

      // Verifica se o SKU já existe
      const [existingSku] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            eq(products.sku, productData.sku),
            isNull(products.deletedAt)
          )
        );

      if (existingSku) {
        return NextResponse.json(
          { error: "SKU já cadastrado. Use a opção de vincular a existente." },
          { status: 409 }
        );
      }

      // Cria o novo produto
      await db.insert(products).values({
        organizationId: ctx.organizationId,
        sku: productData.sku,
        name: productData.name,
        description: productData.description || null,
        unit: productData.unit || item.unit || "UN",
        ncm: productData.ncm,
        origin: productData.origin || "0",
        weightKg: productData.weightKg || null,
        priceCost: productData.priceCost || parseFloat(item.unitPrice || "0"),
        priceSale: productData.priceSale || null,
        status: "ACTIVE",
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        version: 1,
      });

      // Busca o produto recém-criado
      const [newProduct] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organizationId, ctx.organizationId),
            eq(products.sku, productData.sku)
          )
        )
        .orderBy(desc(products.id));

      if (!newProduct) {
        return NextResponse.json(
          { error: "Falha ao criar produto" },
          { status: 500 }
        );
      }

      // Vincula ao item
      await db
        .update(inboundInvoiceItems)
        .set({
          productId: newProduct.id,
        })
        .where(eq(inboundInvoiceItems.id, itemId));

      console.log(`✅ Produto criado (ID: ${newProduct.id}) e vinculado ao item ${itemId}`);

      return NextResponse.json({
        success: true,
        message: "Produto criado e vinculado com sucesso!",
        data: {
          itemId,
          productId: newProduct.id,
          productName: newProduct.name,
        },
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Ação inválida. Forneça product_id ou create_new" },
      { status: 400 }
    );

  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error linking item:", error);
    return NextResponse.json(
      { error: "Falha ao vincular item", details: error.message },
      { status: 500 }
    );
  }
}



