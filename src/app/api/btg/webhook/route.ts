import { NextRequest, NextResponse } from "next/server";
import { pool, ensureConnection } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/btg/webhook
 * Recebe notificações de pagamento do BTG
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("🔔 Webhook BTG recebido:", body);

    // Validar assinatura do webhook (se BTG enviar)
    // const signature = request.headers.get("X-BTG-Signature");
    // TODO: Validar assinatura

    const { type, data } = body;

    await ensureConnection();

    if (type === "boleto.paid" || type === "billing.slip.paid") {
      // Boleto foi pago
      const boletoId = data.id || data.slip_id;
      const valorPago = data.paid_amount ? data.paid_amount / 100 : data.amount;

      // Atualizar boleto no banco
      await pool.request().query(`
        UPDATE btg_boletos
        SET 
          status = 'PAID',
          valor_pago = ${valorPago},
          data_pagamento = GETDATE(),
          webhook_received_at = GETDATE(),
          updated_at = GETDATE()
        WHERE btg_id = '${boletoId}'
      `);

      // Buscar boleto para atualizar vinculações
      const boletoResult = await pool.request().query(`
        SELECT * FROM btg_boletos
        WHERE btg_id = '${boletoId}'
      `);

      if (boletoResult.recordset.length > 0) {
        const boleto = boletoResult.recordset[0];

        // Atualizar Contas a Receber
        if (boleto.accounts_receivable_id) {
          await pool.request().query(`
            UPDATE accounts_receivable
            SET 
              status = 'PAID',
              paid_at = GETDATE(),
              paid_amount = ${valorPago}
            WHERE id = ${boleto.accounts_receivable_id}
          `);
        }

        console.log(`✅ Boleto ${boleto.nosso_numero} marcado como pago!`);
      }
    } else if (type === "pix.paid" || type === "pix.received") {
      // Pix foi pago
      const txid = data.txid;
      const valorPago = data.valor || data.amount;

      await pool.request().query(`
        UPDATE btg_pix_charges
        SET 
          status = 'PAID',
          data_pagamento = GETDATE()
        WHERE txid = '${txid}'
      `);

      // Buscar cobrança para atualizar vinculações
      const pixResult = await pool.request().query(`
        SELECT * FROM btg_pix_charges
        WHERE txid = '${txid}'
      `);

      if (pixResult.recordset.length > 0) {
        const pix = pixResult.recordset[0];

        // Atualizar Contas a Receber
        if (pix.accounts_receivable_id) {
          await pool.request().query(`
            UPDATE accounts_receivable
            SET 
              status = 'PAID',
              paid_at = GETDATE(),
              paid_amount = ${valorPago}
            WHERE id = ${pix.accounts_receivable_id}
          `);
        }

        console.log(`✅ Pix ${txid} marcado como pago!`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao processar webhook BTG:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}









