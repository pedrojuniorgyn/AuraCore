import { NextRequest, NextResponse } from "next/server";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";

/**
 * 📚 GET /api/accounting/journal-entries
 * 
 * Lista lançamentos contábeis
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const branchHeader = request.headers.get("x-branch-id");
    const branchId = branchHeader ? Number(branchHeader) : ctx.defaultBranchId;
    if (!branchId || Number.isNaN(branchId)) {
      return NextResponse.json(
        { error: "Informe x-branch-id (ou defina defaultBranchId)" },
        { status: 400 }
      );
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem acesso à filial informada" },
        { status: 403 }
      );
    }

    const { ensureConnection, pool } = await import("@/lib/db");
    await ensureConnection();

    const result = await pool
      .request()
      .input("orgId", sql.BigInt, ctx.organizationId)
      .input("branchId", sql.BigInt, branchId)
      .query(
        `
        SELECT *
        FROM journal_entries
        WHERE organization_id = @orgId
          AND branch_id = @branchId
          AND deleted_at IS NULL
        ORDER BY entry_date DESC
      `
      );

    return NextResponse.json({ data: result.recordset ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 📝 POST /api/accounting/journal-entries
 * 
 * Criar lançamento manual
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const branchHeader = request.headers.get("x-branch-id");
    const branchId = branchHeader ? Number(branchHeader) : ctx.defaultBranchId;
    if (!branchId || Number.isNaN(branchId)) {
      return NextResponse.json(
        { error: "Informe x-branch-id (ou defina defaultBranchId)" },
        { status: 400 }
      );
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem acesso à filial informada" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entryDate, description, lines } = body;
    
    // Validar
    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: "Lançamento sem linhas" }, { status: 400 });
    }
    
    const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.creditAmount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Lançamento desbalanceado: D=${totalDebit}, C=${totalCredit}` },
        { status: 400 }
      );
    }
    
    // Gerar número
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const entryNumber = `${yearMonth}-MANUAL-${Date.now()}`;

    const entryDt = new Date(entryDate);
    if (Number.isNaN(entryDt.getTime())) {
      return NextResponse.json({ error: "entryDate inválido" }, { status: 400 });
    }

    const created = await withMssqlTransaction(async (tx) => {
      const entryInsert = await tx
        .request()
        .input("orgId", sql.BigInt, ctx.organizationId)
        .input("branchId", sql.BigInt, branchId)
        .input("entryNumber", sql.VarChar(20), entryNumber)
        .input("entryDate", sql.DateTime, entryDt)
        .input("description", sql.VarChar(500), String(description ?? ""))
        .input("totalDebit", sql.Decimal(18, 2), totalDebit)
        .input("totalCredit", sql.Decimal(18, 2), totalCredit)
        .input("createdBy", sql.NVarChar(255), ctx.userId)
        .input("updatedBy", sql.NVarChar(255), ctx.userId)
        .query(
          `
          INSERT INTO journal_entries (
            organization_id, branch_id,
            entry_number, entry_date,
            source_type, source_id,
            description,
            total_debit, total_credit,
            status,
            created_at, updated_at, deleted_at,
            created_by, updated_by, version,
            book_type
          )
          OUTPUT INSERTED.*
          VALUES (
            @orgId, @branchId,
            @entryNumber, @entryDate,
            'MANUAL', NULL,
            @description,
            @totalDebit, @totalCredit,
            'DRAFT',
            GETDATE(), GETDATE(), NULL,
            @createdBy, @updatedBy, 1,
            'GENERAL'
          )
        `
        );

      const newEntry = entryInsert.recordset?.[0];
      if (!newEntry?.id) {
        throw new Error("Falha ao criar journal_entry");
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        await tx
          .request()
          .input("journalEntryId", sql.BigInt, newEntry.id)
          .input("orgId", sql.BigInt, ctx.organizationId)
          .input("lineNumber", sql.Int, i + 1)
          .input("chartAccountId", sql.BigInt, Number(line.chartAccountId))
          .input("debit", sql.Decimal(18, 2), Number(line.debitAmount || 0))
          .input("credit", sql.Decimal(18, 2), Number(line.creditAmount || 0))
          .input("description", sql.VarChar(500), line.description ?? null)
          .input("costCenterId", sql.BigInt, line.costCenterId ? Number(line.costCenterId) : null)
          .input("categoryId", sql.BigInt, line.categoryId ? Number(line.categoryId) : null)
          .input("partnerId", sql.BigInt, line.partnerId ? Number(line.partnerId) : null)
          .query(
            `
            INSERT INTO journal_entry_lines (
              journal_entry_id, organization_id,
              line_number, chart_account_id,
              debit_amount, credit_amount,
              description, cost_center_id, category_id, partner_id
            )
            VALUES (
              @journalEntryId, @orgId,
              @lineNumber, @chartAccountId,
              @debit, @credit,
              @description, @costCenterId, @categoryId, @partnerId
            )
          `
          );
      }

      return newEntry;
    });

    return NextResponse.json({ success: true, entry: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}













