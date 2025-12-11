import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import { createBTGPixPayment } from "@/services/btg/btg-payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/btg/payments/pix
 * Realizar pagamento via Pix BTG
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      beneficiaryName,
      beneficiaryDocument,
      pixKey,
      amount,
      description,
      accountsPayableId,
    } = body;

    if (!beneficiaryName || !beneficiaryDocument || !pixKey || !amount) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // Realizar pagamento via BTG
    const btgPayment = await createBTGPixPayment({
      beneficiaryName,
      beneficiaryDocument,
      pixKey,
      amount,
      description,
    });

    await ensureConnection();

    // Salvar no banco
    const result = await pool.request().query(`
      INSERT INTO btg_payments (
        organization_id, payment_type,
        beneficiary_name, beneficiary_document, beneficiary_pix_key,
        amount, status, btg_transaction_id,
        accounts_payable_id, processed_at,
        created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId},
        'PIX',
        '${beneficiaryName}',
        '${beneficiaryDocument}',
        '${pixKey}',
        ${amount},
        '${btgPayment.status}',
        '${btgPayment.transactionId || btgPayment.id}',
        ${accountsPayableId || "NULL"},
        GETDATE(),
        '${session.user.id}',
        GETDATE()
      )
    `);

    // Se vinculado a Contas a Pagar, atualizar status
    if (accountsPayableId) {
      await pool.request().query(`
        UPDATE accounts_payable
        SET 
          status = 'PAID',
          paid_at = GETDATE(),
          paid_amount = ${amount}
        WHERE id = ${accountsPayableId}
        AND organization_id = ${session.user.organizationId}
      `);
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento Pix realizado com sucesso via BTG!",
      payment: result.recordset[0],
      btgData: btgPayment,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao realizar pagamento Pix BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}








