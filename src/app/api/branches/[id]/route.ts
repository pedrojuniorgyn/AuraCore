import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { createBranchSchema } from "@/lib/validators/branch";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, ne } from "drizzle-orm";

/**
 * GET /api/branches/[id]
 * Busca uma filial específica.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Apenas não deletados
 * - ✅ Data Scoping: Se não for ADMIN, valida acesso à filial
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

    // 🔐 SEGURANÇA: Multi-Tenant + Soft Delete + Data Scoping
    const [branch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(branches.deletedAt) // 🗑️ NÃO DELETADO
        )
      );

    if (!branch) {
      return NextResponse.json(
        { error: "Filial não encontrada ou você não tem permissão para acessá-la." },
        { status: 404 }
      );
    }

    // 🏢 DATA SCOPING: Se não for ADMIN, valida acesso
    if (!ctx.isAdmin && !ctx.allowedBranches.includes(branch.id)) {
      return NextResponse.json(
        { error: "Você não tem permissão para acessar esta filial." },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: branch });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching branch:", error);
    return NextResponse.json(
      { error: "Falha ao buscar filial.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/branches/[id]
 * Atualiza uma filial.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Optimistic Lock: Valida versão
 * - ✅ Auditoria: Registra updated_by
 * - ✅ Data Scoping: Se não for ADMIN, valida acesso
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
    const parsedBody = createBranchSchema.partial().safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { 
          error: "Dados inválidos", 
          errors: parsedBody.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    // Busca filial atual com validações de segurança
    const [currentBranch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(branches.deletedAt)
        )
      );

    if (!currentBranch) {
      return NextResponse.json(
        { error: "Filial não encontrada ou você não tem permissão." },
        { status: 404 }
      );
    }

    // 🏢 DATA SCOPING: Se não for ADMIN, valida acesso
    if (!ctx.isAdmin && !ctx.allowedBranches.includes(currentBranch.id)) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar esta filial." },
        { status: 403 }
      );
    }

    // 🔒 OPTIMISTIC LOCK: Valida versão (se enviada)
    if (body.version !== undefined && body.version !== currentBranch.version) {
      return NextResponse.json(
        {
          error: "Conflito de versão",
          code: "VERSION_CONFLICT",
          details: "A filial foi alterada por outro usuário. Recarregue a página e tente novamente.",
          currentVersion: currentBranch.version,
          sentVersion: body.version,
        },
        { status: 409 }
      );
    }

    const { document, version, ...dataToUpdate } = parsedBody.data;

    // Se o documento for atualizado, verifica duplicidade (excluindo o próprio ID)
    if (document && document !== currentBranch.document) {
      const [duplicateCheck] = await db
        .select()
        .from(branches)
        .where(
          and(
            eq(branches.organizationId, ctx.organizationId),
            eq(branches.document, document),
            ne(branches.id, id),
            isNull(branches.deletedAt)
          )
        );

      if (duplicateCheck) {
        return NextResponse.json(
          { error: "CNPJ já cadastrado para outra filial nesta organização." },
          { status: 409 }
        );
      }
    }

    // Atualiza com Enterprise Base Pattern
    await db
      .update(branches)
      .set({
        ...dataToUpdate,
        ...(document && { document }), // Atualiza documento se fornecido
        updatedBy: ctx.userId, // 📊 AUDITORIA: Quem atualizou
        updatedAt: new Date(),
        version: currentBranch.version + 1, // 🔒 OPTIMISTIC LOCK: Incrementa versão
      })
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId),
          eq(branches.version, currentBranch.version) // Double-check de versão
        )
      );

    // 🔍 SQL Server não suporta .returning(), então fazemos SELECT depois
    const [updatedBranch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId)
        )
      );

    if (!updatedBranch) {
      return NextResponse.json(
        { error: "Falha ao atualizar. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedBranch });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error updating branch:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar filial.", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/branches/[id]
 * Soft Delete de uma filial.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Valida organization_id
 * - ✅ Soft Delete: Marca deleted_at
 * - ✅ Auditoria: Registra updated_by
 * - ✅ Data Scoping: Se não for ADMIN, valida acesso
 * - ✅ Regra de Negócio: Matriz (ID 1) não pode ser deletada
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

    // 🚫 REGRA DE NEGÓCIO: Matriz (ID 1) não pode ser deletada
    if (id === 1) {
      return NextResponse.json(
        { error: "A Matriz (ID 1) não pode ser excluída." },
        { status: 403 }
      );
    }

    // Busca filial atual com validações de segurança
    const [currentBranch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          isNull(branches.deletedAt)
        )
      );

    if (!currentBranch) {
      return NextResponse.json(
        { error: "Filial não encontrada ou você não tem permissão." },
        { status: 404 }
      );
    }

    // 🏢 DATA SCOPING: Se não for ADMIN, valida acesso
    if (!ctx.isAdmin && !ctx.allowedBranches.includes(currentBranch.id)) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir esta filial." },
        { status: 403 }
      );
    }

    // 🗑️ SOFT DELETE: Marca como deletado (não exclui fisicamente)
    await db
      .update(branches)
      .set({
        deletedAt: new Date(), // 🗑️ Marca timestamp de exclusão
        updatedBy: ctx.userId, // 📊 AUDITORIA: Quem deletou
        updatedAt: new Date(),
        version: currentBranch.version + 1, // 🔒 Incrementa versão
        status: "INACTIVE", // Muda status para consistência
      })
      .where(
        and(
          eq(branches.id, id),
          eq(branches.organizationId, ctx.organizationId)
        )
      );

    return NextResponse.json({
      message: "Filial excluída com sucesso.",
      data: { id, name: currentBranch.name },
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error deleting branch:", error);
    return NextResponse.json(
      { error: "Falha ao excluir filial.", details: error.message },
      { status: 500 }
    );
  }
}
