import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";

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
    const bankAccountId = parseInt(formData.get("bankAccountId") as string);

    if (!file || !bankAccountId) {
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

    // Inserir transações
    for (const tx of transactions) {
      await pool.request().query(`
        INSERT INTO bank_transactions (
          organization_id, bank_account_id, transaction_date,
          description, amount, transaction_type,
          created_by, created_at
        ) VALUES (
          ${session.user.organizationId}, ${bankAccountId}, '${tx.date}',
          '${tx.description}', ${tx.amount}, '${tx.type}',
          '${session.user.id}', GETDATE()
        )
      `);
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

