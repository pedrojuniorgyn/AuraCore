import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import sql from "mssql";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/financial/bank-transactions/import-ofx
 * Importa arquivo OFX e cria transações bancárias
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bankAccountIdRaw = formData.get("bankAccountId") as string;
    const bankAccountId = Number(bankAccountIdRaw);

    if (!file || !Number.isFinite(bankAccountId) || bankAccountId <= 0) {
      return NextResponse.json(
        { error: "Arquivo OFX e conta bancária são obrigatórios" },
        { status: 400 }
      );
    }

    // Ler conteúdo do arquivo
    const content = await file.text();

    // Parse OFX simplificado (usar lib ofx-js em produção)
    // Por enquanto, vamos apenas criar um registro de exemplo
    const transactions = parseOFXContent(content);

    await ensureConnection();

    // Validar conta bancária pertence ao tenant
    const bankAccountCheck = await pool
      .request()
      .input("orgId", sql.Int, Number(session.user.organizationId))
      .input("bankAccountId", sql.Int, Math.trunc(bankAccountId))
      .query(
        `
        SELECT TOP 1 id
        FROM bank_accounts
        WHERE id = @bankAccountId
          AND organization_id = @orgId
          AND deleted_at IS NULL
      `
      );

    if (!bankAccountCheck.recordset?.length) {
      return NextResponse.json(
        { error: "Conta bancária não encontrada" },
        { status: 404 }
      );
    }

    // Inserir transações
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (!tx.date || !Number.isFinite(amount)) continue;

      await pool
        .request()
        .input("orgId", sql.Int, Number(session.user.organizationId))
        .input("bankAccountId", sql.Int, Math.trunc(bankAccountId))
        .input("txDate", sql.DateTime2, new Date(tx.date))
        .input("description", sql.NVarChar(500), String(tx.description ?? ""))
        .input("amount", sql.Decimal(18, 2), amount)
        .input("type", sql.NVarChar(50), String(tx.type ?? "UNKNOWN"))
        .input("createdBy", sql.NVarChar(255), String(session.user.id))
        .query(
          `
          INSERT INTO bank_transactions (
            organization_id, bank_account_id, transaction_date,
            description, amount, transaction_type,
            created_by, created_at
          ) VALUES (
            @orgId, @bankAccountId, @txDate,
            @description, @amount, @type,
            @createdBy, GETDATE()
          )
        `
        );
    }

    return NextResponse.json({
      success: true,
      message: `${transactions.length} transações importadas com sucesso`,
      count: transactions.length,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao importar OFX:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Parse simplificado de OFX
 * TODO: Implementar parser completo usando lib ofx-js
 */
function parseOFXContent(content: string): Array<{
  date: string;
  description: string;
  amount: number;
  type: string;
}> {
  // Parse simplificado - apenas para demonstração
  // Em produção, usar: https://www.npmjs.com/package/ofx-js
  
  const transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: string;
  }> = [];

  // Exemplo básico de extração (regex simples)
  const lines = content.split("\n");
  
  for (const line of lines) {
    if (line.includes("<STMTTRN>")) {
      // Início de uma transação
      // TODO: Implementar parsing completo
    }
  }

  // Por enquanto, retorna vazio
  // Em produção, isso deve extrair do XML/OFX
  return transactions;
}

