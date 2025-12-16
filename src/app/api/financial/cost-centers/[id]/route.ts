import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { costCenters } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

/**
 * GET /api/financial/cost-centers/:id
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();
    const id = parseInt(resolvedParams.id);

    const result = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, ctx.organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao buscar centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar centro de custo" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/financial/cost-centers/:id
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const updatedBy = ctx.userId;
    const id = parseInt(resolvedParams.id);

    const body = await req.json();
    const { code, name, type, parentId, status, ccClass } = body;

    // Verificar se existe
    const existing = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    // ✅ VALIDAÇÃO: Bloqueio de edição de código após lançamentos
    if (code && code !== existing[0].code) {
      // Verificar se tem lançamentos contábeis
      const hasEntriesResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM journal_entry_lines 
        WHERE cost_center_id = ${id}
          AND deleted_at IS NULL
      `);
      const hasEntries = (hasEntriesResult[0]?.count || 0) > 0;

      if (hasEntries) {
        return NextResponse.json(
          {
            error: `❌ Código não pode ser alterado. Centro de Custo "${existing[0].code} - ${existing[0].name}" possui ${hasEntriesResult[0].count} lançamento(s) contábil(is).`,
            code: "CODE_LOCKED",
            count: hasEntriesResult[0].count,
            suggestion: "Você pode editar nome, descrição ou status, mas não o código.",
            reason: "Integridade de auditoria"
          },
          { status: 400 }
        );
      }

      // Verificar código duplicado
      const duplicate = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.organizationId, organizationId),
            eq(costCenters.code, code),
            isNull(costCenters.deletedAt)
          )
        );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: "Código já existe" },
          { status: 400 }
        );
      }
    }

    // Recalcular nível se mudou o pai
    let level = existing[0].level;
    if (parentId !== undefined && parentId !== existing[0].parentId) {
      if (parentId === null) {
        level = 0;
      } else {
        const parent = await db
          .select()
          .from(costCenters)
          .where(
            and(
              eq(costCenters.id, parentId),
              eq(costCenters.organizationId, organizationId),
              isNull(costCenters.deletedAt)
            )
          );

        if (parent.length === 0) {
          return NextResponse.json(
            { error: "Centro de custo pai não encontrado" },
            { status: 404 }
          );
        }

        level = (parent[0].level || 0) + 1;
      }
    }

    // Atualizar
    await db
      .update(costCenters)
      .set({
        code: code || existing[0].code,
        name: name || existing[0].name,
        type: type || existing[0].type,
        parentId: parentId !== undefined ? parentId : existing[0].parentId,
        level,
        isAnalytical: type === "ANALYTIC" || existing[0].isAnalytical,
        class: ccClass !== undefined ? ccClass : existing[0].class, // ✅ CLASSE
        status: status || existing[0].status,
        updatedBy,
        updatedAt: new Date(),
        version: existing[0].version + 1,
      })
      .where(and(eq(costCenters.id, id), eq(costCenters.organizationId, organizationId)));

    const [updated] = await db
      .select()
      .from(costCenters)
      .where(and(eq(costCenters.id, id), eq(costCenters.organizationId, organizationId)))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: "Centro de custo atualizado com sucesso!",
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao atualizar centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar centro de custo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial/cost-centers/:id
 * Soft delete com validações de integridade
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const updatedBy = ctx.userId;
    const id = parseInt(resolvedParams.id);

    // Verificar se existe
    const existing = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    const costCenter = existing[0];

    // ✅ VALIDAÇÃO 1: Verificar lançamentos contábeis
    const journalEntriesResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM journal_entry_lines 
      WHERE cost_center_id = ${id}
        AND deleted_at IS NULL
    `);
    const journalEntriesCount = journalEntriesResult[0]?.count || 0;

    if (journalEntriesCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Centro de Custo "${costCenter.code} - ${costCenter.name}" possui ${journalEntriesCount} lançamento(s) contábil(is).`,
          code: "HAS_JOURNAL_ENTRIES",
          count: journalEntriesCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar o centro de custo (Status = INACTIVE)."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 2: Verificar contas a pagar
    const payablesResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM accounts_payable 
      WHERE cost_center_id = ${id}
        AND deleted_at IS NULL
    `);
    const payablesCount = payablesResult[0]?.count || 0;

    if (payablesCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Centro de Custo "${costCenter.code} - ${costCenter.name}" possui ${payablesCount} conta(s) a pagar.`,
          code: "HAS_PAYABLES",
          count: payablesCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar o centro de custo."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 3: Verificar contas a receber
    const receivablesResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM accounts_receivable 
      WHERE cost_center_id = ${id}
        AND deleted_at IS NULL
    `);
    const receivablesCount = receivablesResult[0]?.count || 0;

    if (receivablesCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Centro de Custo "${costCenter.code} - ${costCenter.name}" possui ${receivablesCount} conta(s) a receber.`,
          code: "HAS_RECEIVABLES",
          count: receivablesCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar o centro de custo."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 4: Verificar ordens de serviço
    const workOrdersResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM work_orders 
      WHERE cost_center_id = ${id}
        AND deleted_at IS NULL
    `);
    const workOrdersCount = workOrdersResult[0]?.count || 0;

    if (workOrdersCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Centro de Custo "${costCenter.code} - ${costCenter.name}" possui ${workOrdersCount} ordem(ns) de serviço.`,
          code: "HAS_WORK_ORDERS",
          count: workOrdersCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar o centro de custo."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 5: Verificar se tem filhos
    const children = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.parentId, id),
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (children.length > 0) {
      const childCodes = children.map(c => c.code).join(', ');
      return NextResponse.json(
        {
          error: `❌ Centro de Custo "${costCenter.code} - ${costCenter.name}" possui ${children.length} centro(s) de custo filho(s): ${childCodes}`,
          code: "HAS_CHILDREN",
          count: children.length,
          suggestion: "Exclua ou mova os centros de custo filhos primeiro."
        },
        { status: 400 }
      );
    }

    // ✅ Se passou em todas validações, permite soft delete
    await db
      .update(costCenters)
      .set({
        deletedAt: new Date(),
        status: "INACTIVE",
        updatedBy,
      })
      .where(and(eq(costCenters.id, id), eq(costCenters.organizationId, organizationId)));

    return NextResponse.json({
      success: true,
      message: "Centro de custo excluído com sucesso!",
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao excluir centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao excluir centro de custo" },
      { status: 500 }
    );
  }
}




