import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logChartAccountChange } from "@/services/audit-logger";

/**
 * GET /api/financial/chart-accounts/:id
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const id = parseInt(resolvedParams.id);

    const result = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("❌ Erro ao buscar conta:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/financial/chart-accounts/:id
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const updatedBy = session.user.email || "system";
    const id = parseInt(resolvedParams.id);

    const body = await req.json();
    const {
      code,
      name,
      type,
      category,
      parentId,
      status,
      acceptsCostCenter,
      requiresCostCenter,
    } = body;

    // Verificar se existe
    const existing = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // ✅ VALIDAÇÃO: Bloqueio de edição de código após lançamentos
    if (code && code !== existing[0].code) {
      // Verificar se tem lançamentos contábeis
      const hasEntriesResult = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM journal_entry_lines 
        WHERE chart_account_id = ${id}
          AND deleted_at IS NULL
      `);
      const hasEntries = (hasEntriesResult[0]?.count || 0) > 0;

      if (hasEntries) {
        return NextResponse.json(
          {
            error: `❌ Código não pode ser alterado. Conta "${existing[0].code} - ${existing[0].name}" possui ${hasEntriesResult[0].count} lançamento(s) contábil(is).`,
            code: "CODE_LOCKED",
            count: hasEntriesResult[0].count,
            suggestion: "Você pode editar nome, descrição ou status, mas não o código.",
            reason: "Integridade de auditoria (NBC TG 26)"
          },
          { status: 400 }
        );
      }

      // Verificar código duplicado
      const duplicate = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.organizationId, organizationId),
            eq(chartOfAccounts.code, code),
            isNull(chartOfAccounts.deletedAt)
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
          .from(chartOfAccounts)
          .where(eq(chartOfAccounts.id, parentId));

        if (parent.length === 0) {
          return NextResponse.json(
            { error: "Conta pai não encontrada" },
            { status: 404 }
          );
        }

        level = (parent[0].level || 0) + 1;
      }
    }

    // Atualizar
    const [updated] = await db
      .update(chartOfAccounts)
      .set({
        code: code || existing[0].code,
        name: name || existing[0].name,
        type: type || existing[0].type,
        category: category !== undefined ? category : existing[0].category,
        parentId: parentId !== undefined ? parentId : existing[0].parentId,
        level,
        acceptsCostCenter:
          acceptsCostCenter !== undefined
            ? acceptsCostCenter
            : existing[0].acceptsCostCenter,
        requiresCostCenter:
          requiresCostCenter !== undefined
            ? requiresCostCenter
            : existing[0].requiresCostCenter,
        status: status || existing[0].status,
        updatedBy,
        updatedAt: new Date(),
        version: existing[0].version + 1,
      })
      .where(eq(chartOfAccounts.id, id))
      .returning();

    // ✅ Registrar auditoria
    await logChartAccountChange({
      entityType: "CHART_ACCOUNT",
      entityId: id,
      operation: "UPDATE",
      oldData: existing[0],
      newData: updated,
      changedBy: updatedBy,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Conta atualizada com sucesso!",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar conta:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial/chart-accounts/:id
 * Soft delete com validações de integridade
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const updatedBy = session.user.email || "system";
    const id = parseInt(resolvedParams.id);

    // Verificar se existe
    const existing = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    const account = existing[0];

    // ✅ VALIDAÇÃO 1: Verificar lançamentos contábeis
    const journalEntriesResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM journal_entry_lines 
      WHERE chart_account_id = ${id}
        AND deleted_at IS NULL
    `);
    const journalEntriesCount = journalEntriesResult[0]?.count || 0;

    if (journalEntriesCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Conta "${account.code} - ${account.name}" possui ${journalEntriesCount} lançamento(s) contábil(is).`,
          code: "HAS_JOURNAL_ENTRIES",
          count: journalEntriesCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar a conta (Status = INACTIVE).",
          reason: "Integridade contábil e auditoria (NBC TG 26)"
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 2: Verificar se tem contas filhas
    const children = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.parentId, id),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (children.length > 0) {
      const childCodes = children.map(c => c.code).join(', ');
      return NextResponse.json(
        {
          error: `❌ Conta "${account.code} - ${account.name}" possui ${children.length} conta(s) filha(s): ${childCodes}`,
          code: "HAS_CHILDREN",
          count: children.length,
          suggestion: "Exclua ou mova as contas filhas primeiro."
        },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO 3: Verificar uso em itens de documentos fiscais
    const fiscalItemsResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM fiscal_document_items 
      WHERE chart_account_id = ${id}
        AND deleted_at IS NULL
    `);
    const fiscalItemsCount = fiscalItemsResult[0]?.count || 0;

    if (fiscalItemsCount > 0) {
      return NextResponse.json(
        {
          error: `❌ Conta "${account.code} - ${account.name}" está vinculada a ${fiscalItemsCount} item(ns) de documento(s) fiscal(is).`,
          code: "HAS_FISCAL_ITEMS",
          count: fiscalItemsCount,
          suggestion: "Não é possível excluir. Alternativa: Desativar a conta."
        },
        { status: 400 }
      );
    }

    // ✅ Se passou em todas validações, permite soft delete
    await db
      .update(chartOfAccounts)
      .set({
        deletedAt: new Date(),
        status: "INACTIVE",
        updatedBy,
      })
      .where(eq(chartOfAccounts.id, id));

    // ✅ Registrar auditoria
    await logChartAccountChange({
      entityType: "CHART_ACCOUNT",
      entityId: id,
      operation: "DELETE",
      oldData: account,
      changedBy: updatedBy,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Conta excluída com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir conta:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta" },
      { status: 500 }
    );
  }
}




