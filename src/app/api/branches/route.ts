import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { createBranchSchema } from "@/lib/validators/branch";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, ilike, or, inArray, desc } from "drizzle-orm";

/**
 * GET /api/branches
 * Lista todas as filiais da organização do usuário logado.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Filtra por organization_id
 * - ✅ Soft Delete: Apenas filiais não deletadas
 * - ✅ Data Scoping: Se não for ADMIN, filtra por filiais permitidas
 * 
 * Query Params:
 * - search: Busca por nome/documento
 * - status: Filtra por status
 */
export async function GET(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    // 🔐 SEGURANÇA: Obtém contexto do tenant
    const ctx = await getTenantContext();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // Construir condições dinamicamente
    const conditions = [
      eq(branches.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO MULTI-TENANT
      isNull(branches.deletedAt) // 🗑️ APENAS NÃO DELETADOS
    ];

    // Filtro por busca (nome, trade_name, document)
    if (search) {
      const searchCondition = or(
        ilike(branches.name, `%${search}%`),
        ilike(branches.tradeName, `%${search}%`),
        ilike(branches.document, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Filtro por status
    if (status) {
      conditions.push(eq(branches.status, status));
    }

    // 🏢 DATA SCOPING: Se não for ADMIN, filtra por filiais permitidas
    if (!ctx.isAdmin && ctx.allowedBranches.length > 0) {
      conditions.push(inArray(branches.id, ctx.allowedBranches));
    } else if (!ctx.isAdmin && ctx.allowedBranches.length === 0) {
      // Usuário sem filiais permitidas = sem acesso
      return NextResponse.json({ data: [], total: 0 });
    }

    const branchesList = await db
      .select()
      .from(branches)
      .where(and(...conditions.filter(Boolean)));

    return NextResponse.json({
      data: branchesList,
      total: branchesList.length,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    // Se for erro de autenticação, retorna a resposta de erro direto
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error fetching branches:", error);
    return NextResponse.json(
      { error: "Falha ao buscar filiais.", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/branches
 * Cria uma nova filial.
 * 
 * Segurança:
 * - ✅ Multi-Tenant: Injeta organization_id automaticamente
 * - ✅ Auditoria: Registra created_by/updated_by
 * - ✅ Validação: Zod schema
 * - ✅ Uniqueness: Valida CNPJ único dentro da organização
 */
export async function POST(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco (necessário para checar colunas auxiliares)
    const { ensureConnection, pool } = await import("@/lib/db");
    await ensureConnection();

    // 🔐 SEGURANÇA: Obtém contexto do tenant
    const ctx = await getTenantContext();

    const body = await request.json();
    
    // Validação Zod
    const parsedBody = createBranchSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { 
          error: "Dados inválidos", 
          errors: parsedBody.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { document, legacyCompanyBranchCode, ...data } = parsedBody.data;

    // Compatibilidade: se a coluna ainda não existir no banco, ignoramos o campo (evita 500).
    const legacyColCheck = await pool.request().query(`
      SELECT COL_LENGTH('dbo.branches', 'legacy_company_branch_code') as col;
    `);
    const legacyColExists = (legacyColCheck.recordset?.[0] as Record<string, unknown>)?.col != null;

    // Verifica se CNPJ já existe nesta organização (e não está deletado)
    const existingBranch = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.organizationId, ctx.organizationId), // 🔐 ISOLAMENTO
          eq(branches.document, document),
          isNull(branches.deletedAt) // Ignora deletados
        )
      );

    if (existingBranch.length > 0) {
      return NextResponse.json(
        { error: "CNPJ já cadastrado para esta organização." },
        { status: 409 }
      );
    }

    // Cria a filial com Enterprise Base Pattern
    await db.insert(branches).values({
      ...data,
      document,
      ...(legacyColExists && legacyCompanyBranchCode !== undefined
        ? { legacyCompanyBranchCode: legacyCompanyBranchCode as number }
        : {}),
      organizationId: ctx.organizationId, // 🔐 INJETA ORGANIZATION_ID (não confia no front)
      createdBy: ctx.userId, // 📊 AUDITORIA: Quem criou
      updatedBy: ctx.userId, // 📊 AUDITORIA: Quem criou (igual)
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1, // 🔒 OPTIMISTIC LOCK: Versão inicial
      status: data.status || "ACTIVE",
    });

    // SQL Server não suporta RETURNING, então buscamos o registro recém-criado
    const [newBranch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.organizationId, ctx.organizationId),
          eq(branches.document, document)
        )
      )
      .orderBy(desc(branches.id));

    return NextResponse.json(newBranch, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error creating branch:", error);
    return NextResponse.json(
      { error: "Falha ao criar filial.", details: errorMessage },
      { status: 500 }
    );
  }
}
