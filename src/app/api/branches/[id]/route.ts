import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { createBranchSchema } from "@/lib/validators/branch";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, ne } from "drizzle-orm";

async function fetchBranchRaw(pool: any, id: number, organizationId: number) {
  // Compatibilidade com schema divergente: algumas implantações podem não ter colunas novas.
  // Importante: o frontend espera camelCase (mesmo formato do Drizzle).
  const colCheck = await pool.request().query(`
    SELECT
      COL_LENGTH('dbo.branches', 'legacy_company_branch_code') as legacy_col,
      COL_LENGTH('dbo.branches', 'c_class_trib') as cclasstrib_col;
  `);
  const legacyColExists = (colCheck.recordset?.[0] as any)?.legacy_col != null;
  const cClassTribColExists = (colCheck.recordset?.[0] as any)?.cclasstrib_col != null;

  const legacySelect = legacyColExists
    ? "b.legacy_company_branch_code"
    : "CAST(NULL as int)";
  const cClassTribSelect = cClassTribColExists
    ? "b.c_class_trib"
    : "CAST(NULL as nvarchar(10))";

  const r = await pool
    .request()
    .input("id", id)
    .input("org", organizationId)
    .query(`
      SELECT TOP 1
        b.id,
        b.organization_id as organizationId,
        ${legacySelect} as legacyCompanyBranchCode,
        b.name,
        b.trade_name as tradeName,
        b.document,
        b.email,
        b.phone,
        b.ie,
        b.im,
        ${cClassTribSelect} as cClassTrib,
        b.crt,
        b.zip_code as zipCode,
        b.street,
        b.number,
        b.complement,
        b.district,
        b.city_code as cityCode,
        b.city_name as cityName,
        b.state,
        b.time_zone as timeZone,
        b.logo_url as logoUrl,
        b.certificate_pfx as certificatePfx,
        b.certificate_password as certificatePassword,
        b.certificate_expiry as certificateExpiry,
        b.last_nsu as lastNsu,
        b.environment,
        b.created_by as createdBy,
        b.updated_by as updatedBy,
        b.created_at as createdAt,
        b.updated_at as updatedAt,
        b.deleted_at as deletedAt,
        b.version,
        b.status
      FROM dbo.branches b
      WHERE b.id = @id
        AND b.organization_id = @org
        AND b.deleted_at IS NULL;
    `);
  return (r.recordset?.[0] as any) ?? null;
}

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
    const { ensureConnection, pool } = await import("@/lib/db");
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

    // ✅ Compatibilidade (evita 500 quando schema diverge do Drizzle):
    // Usamos SELECT * via pool para não depender de colunas novas no schema local.
    const branch = await fetchBranchRaw(pool, id, ctx.organizationId);

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
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? errorMessage : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching branch:", error);
    return NextResponse.json(
      { error: "Falha ao buscar filial.", details: errorMessage },
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
    const { ensureConnection, pool } = await import("@/lib/db");
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

    // Busca filial atual (raw) para evitar 500 por divergência de schema
    const currentBranch = await fetchBranchRaw(pool, id, ctx.organizationId);

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

    const { document, legacyCompanyBranchCode, ...dataToUpdate } = parsedBody.data;

    // Compatibilidade: se a coluna ainda não existir no banco, ignoramos o campo (evita 500).
    const legacyColCheck = await pool.request().query(`
      SELECT COL_LENGTH('dbo.branches', 'legacy_company_branch_code') as col;
    `);
    const legacyColExists = (legacyColCheck.recordset?.[0] as any)?.col != null;

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
        ...(legacyColExists && legacyCompanyBranchCode !== undefined
          ? { legacyCompanyBranchCode: legacyCompanyBranchCode as number }
          : {}),
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

    // 🔍 SQL Server não suporta .returning(); e SELECT via Drizzle pode quebrar se schema divergir.
    const updatedBranch = await fetchBranchRaw(pool, id, ctx.organizationId);

    if (!updatedBranch) {
      return NextResponse.json(
        { error: "Falha ao atualizar. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedBranch });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? errorMessage : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error updating branch:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar filial.", details: errorMessage },
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
    const { ensureConnection, pool } = await import("@/lib/db");
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

    // Busca filial atual (raw) para evitar 500 por divergência de schema
    const currentBranch = await fetchBranchRaw(pool, id, ctx.organizationId);

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
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? errorMessage : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error deleting branch:", error);
    return NextResponse.json(
      { error: "Falha ao excluir filial.", details: errorMessage },
      { status: 500 }
    );
  }
}
