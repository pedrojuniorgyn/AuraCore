import { NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

import { logger } from '@/shared/infrastructure/logging';
// Interface para queries de contagem SQL
interface CountResult {
  count: number;
}

// ============================================================================
// AUDIT LOGGER (inline)
// TODO (E9.2): Migrar para src/modules/accounting/domain/services/AuditLogger.ts
// ============================================================================

interface AuditLogEntry {
  entityType: "CHART_ACCOUNT" | "FINANCIAL_CATEGORY" | "COST_CENTER";
  entityId: number;
  operation: "INSERT" | "UPDATE" | "DELETE";
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedBy: string;
  reason?: string;
  ipAddress?: string;
}

/**
 * Registra auditoria de Plano de Contas
 */
async function logChartAccountChange(data: AuditLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO chart_accounts_audit (
        chart_account_id,
        operation,
        old_code,
        old_name,
        old_type,
        old_status,
        old_category,
        new_code,
        new_name,
        new_type,
        new_status,
        new_category,
        changed_by,
        reason,
        ip_address
      ) VALUES (
        ${data.entityId},
        ${data.operation},
        ${data.oldData?.code || null},
        ${data.oldData?.name || null},
        ${data.oldData?.type || null},
        ${data.oldData?.status || null},
        ${data.oldData?.category || null},
        ${data.newData?.code || null},
        ${data.newData?.name || null},
        ${data.newData?.type || null},
        ${data.newData?.status || null},
        ${data.newData?.category || null},
        ${data.changedBy},
        ${data.reason || null},
        ${data.ipAddress || null}
      )
    `);
  } catch (error) {
    logger.error("❌ Erro ao registrar auditoria de Chart Account:", error);
    // Não interrompe a operação principal
  }
}

/**
 * GET /api/financial/chart-accounts/:id
 */
export const GET = withDI(async (req: Request, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();
    const id = parseInt(resolvedParams.id);

    const result = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, ctx.organizationId),
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
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao buscar conta:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta" },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/financial/chart-accounts/:id
 */
export const PUT = withDI(async (req: Request, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const updatedBy = ctx.userId;
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
      const hasEntriesData = (hasEntriesResult.recordset || hasEntriesResult) as unknown as CountResult[];
      const hasEntriesRow = hasEntriesData[0];
      const hasEntries = (hasEntriesRow?.count || 0) > 0;

      if (hasEntries) {
        return NextResponse.json(
          {
            error: `❌ Código não pode ser alterado. Conta "${existing[0].code} - ${existing[0].name}" possui ${hasEntriesRow?.count || 0} lançamento(s) contábil(is).`,
            code: "CODE_LOCKED",
            count: hasEntriesRow?.count || 0,
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
          .where(
            and(
              eq(chartOfAccounts.id, parentId),
              eq(chartOfAccounts.organizationId, organizationId),
              isNull(chartOfAccounts.deletedAt)
            )
          );

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
    await db
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
      .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.organizationId, organizationId)));

    const updated = await queryFirst<typeof chartOfAccounts.$inferSelect>(
      db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.organizationId, organizationId)))
        .orderBy(asc(chartOfAccounts.id))
    );

    // ✅ Registrar auditoria
    await logChartAccountChange({
      entityType: "CHART_ACCOUNT",
      entityId: id,
      operation: "UPDATE",
      oldData: existing[0] as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
      changedBy: updatedBy,
    }).catch((err: unknown) => logger.error("Erro ao registrar auditoria de atualização de Chart Account:", err));

    return NextResponse.json({
      success: true,
      message: "Conta atualizada com sucesso!",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao atualizar conta:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta" },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/financial/chart-accounts/:id
 * Soft delete com validações de integridade
 */
export const DELETE = withDI(async (req: Request, context: RouteContext) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await context.params;
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const updatedBy = ctx.userId;
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
    const journalEntriesData = (journalEntriesResult.recordset || journalEntriesResult) as unknown as CountResult[];
    const journalEntriesRow = journalEntriesData[0];
    const journalEntriesCount = journalEntriesRow?.count || 0;

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
          eq(chartOfAccounts.organizationId, organizationId),
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
    const fiscalItemsData = (fiscalItemsResult.recordset || fiscalItemsResult) as unknown as CountResult[];
    const fiscalItemsRow = fiscalItemsData[0];
    const fiscalItemsCount = fiscalItemsRow?.count || 0;

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
      .where(and(eq(chartOfAccounts.id, id), eq(chartOfAccounts.organizationId, organizationId)));

    // ✅ Registrar auditoria
    await logChartAccountChange({
      entityType: "CHART_ACCOUNT",
      entityId: id,
      operation: "DELETE",
      oldData: account,
      changedBy: updatedBy,
    }).catch((err: unknown) => logger.error("Erro ao registrar auditoria de exclusão de Chart Account:", err));

    return NextResponse.json({
      success: true,
      message: "Conta excluída com sucesso!",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao excluir conta:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta" },
      { status: 500 }
    );
  }
});


