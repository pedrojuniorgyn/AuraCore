import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businessPartners } from "@/lib/db/schema";
import { createBusinessPartnerSchema } from "@/lib/validators/business-partner";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, ne } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
/**
 * GET /api/business-partners/[id]
 * Busca um parceiro de negócio específico.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Apenas não deletados
 */
export const GET = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await context.params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // 🔐 SEGURANÇA: Multi-Tenant + Soft Delete
    const [partner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(businessPartners.deletedAt) // 🗑️ NÃO DELETADO
        )
      );

    if (!partner) {
      return NextResponse.json(
        { error: "Parceiro não encontrado ou você não tem permissão para acessá-lo." },
        { status: 404 }
      );
    }

    return NextResponse.json(partner);
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    logger.error("❌ Error fetching business partner:", error);
    return NextResponse.json(
      { error: "Falha ao buscar parceiro de negócio.", details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/business-partners/[id]
 * Atualiza um parceiro de negócio.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Optimistic Lock: Valida versão
 * - ✅ Auditoria: Registra updated_by
 */
export const PUT = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await context.params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validação Zod (partial para PUT)
    const parsedBody = createBusinessPartnerSchema.partial().safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { 
          error: "Dados inválidos", 
          errors: parsedBody.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    // Busca parceiro atual com validações de segurança
    const [currentPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(businessPartners.deletedAt)
        )
      );

    if (!currentPartner) {
      return NextResponse.json(
        { error: "Parceiro não encontrado ou você não tem permissão." },
        { status: 404 }
      );
    }

    // 🔒 OPTIMISTIC LOCK: Valida versão (se enviada)
    if (body.version !== undefined && body.version !== currentPartner.version) {
      return NextResponse.json(
        {
          error: "Conflito de versão",
          code: "VERSION_CONFLICT",
          details: "O parceiro foi alterado por outro usuário. Recarregue a página e tente novamente.",
          currentVersion: currentPartner.version,
          sentVersion: body.version,
        },
        { status: 409 }
      );
    }

    const { document, ...dataToUpdate } = parsedBody.data;

    // Se o documento for atualizado, verifica duplicidade (excluindo o próprio ID)
    if (document && document !== currentPartner.document) {
      const [duplicateCheck] = await db
        .select()
        .from(businessPartners)
        .where(
          and(
            eq(businessPartners.organizationId, ctx.organizationId),
            eq(businessPartners.document, document),
            ne(businessPartners.id, id),
            isNull(businessPartners.deletedAt)
          )
        );

      if (duplicateCheck) {
        return NextResponse.json(
          { error: "Documento (CPF/CNPJ) já cadastrado para outro parceiro nesta organização." },
          { status: 409 }
        );
      }
    }

    // Atualiza com Enterprise Base Pattern
    await db
      .update(businessPartners)
      .set({
        ...dataToUpdate,
        ...(document && { document }), // Atualiza documento se fornecido
        updatedBy: ctx.userId, // 📊 AUDITORIA: Quem atualizou
        updatedAt: new Date(),
        version: currentPartner.version + 1, // 🔒 OPTIMISTIC LOCK: Incrementa versão
      })
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId),
          eq(businessPartners.version, currentPartner.version) // Double-check de versão
        )
      );

    // Busca o registro atualizado
    const [updatedPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId)
        )
      );

    if (!updatedPartner) {
      return NextResponse.json(
        { error: "Falha ao atualizar. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPartner);
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    logger.error("❌ Error updating business partner:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar parceiro de negócio.", details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/business-partners/[id]
 * Soft Delete de um parceiro de negócio.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Marca deleted_at
 * - ✅ Auditoria: Registra updated_by
 */
export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const resolvedParams = await context.params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Busca parceiro atual com validações de segurança
    const [currentPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(businessPartners.deletedAt)
        )
      );

    if (!currentPartner) {
      return NextResponse.json(
        { error: "Parceiro não encontrado ou você não tem permissão." },
        { status: 404 }
      );
    }

    // 🗑️ SOFT DELETE: Marca como deletado (não exclui fisicamente)
    await db
      .update(businessPartners)
      .set({
        deletedAt: new Date(), // 🗑️ Marca timestamp de exclusão
        updatedBy: ctx.userId, // 📊 AUDITORIA: Quem deletou
        updatedAt: new Date(),
        version: currentPartner.version + 1, // 🔒 Incrementa versão
        status: "INACTIVE", // Muda status para consistência
      })
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId)
        )
      );

    // Retorna o parceiro deletado (soft delete)
    const [deletedPartner] = await db
      .select()
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.id, id),
          eq(businessPartners.organizationId, ctx.organizationId)
        )
      );

    if (!deletedPartner) {
      return NextResponse.json(
        { error: "Falha ao excluir parceiro de negócio." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Parceiro de negócio excluído com sucesso.",
      data: deletedPartner,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    logger.error("❌ Error deleting business partner:", error);
    return NextResponse.json(
      { error: "Falha ao excluir parceiro de negócio.", details: errorMessage },
      { status: 500 }
    );
  }
});
