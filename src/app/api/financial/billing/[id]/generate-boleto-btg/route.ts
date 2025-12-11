import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool, ensureConnection } from "@/lib/db";
import { generateBTGBoleto } from "@/services/btg/btg-boleto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/financial/billing/:id/generate-boleto-btg
 * Gerar boleto BTG para uma fatura
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const billingId = parseInt(resolvedParams.id);

    await ensureConnection();

    // Buscar fatura
    const billingResult = await pool.request().query(`
      SELECT 
        b.*,
        p.company_name as customer_name,
        p.document as customer_document,
        p.email as customer_email
      FROM billing_invoices b
      LEFT JOIN business_partners p ON p.id = b.customer_id
      WHERE b.id = ${billingId}
      AND b.organization_id = ${session.user.organizationId}
    `);

    if (billingResult.recordset.length === 0) {
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
    }

    const billing = billingResult.recordset[0];

    // Verificar se já tem boleto BTG
    const existingResult = await pool.request().query(`
      SELECT * FROM btg_boletos
      WHERE billing_invoice_id = ${billingId}
      AND status NOT IN ('CANCELLED')
    `);

    if (existingResult.recordset.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Já existe um boleto BTG para esta fatura",
        boleto: existingResult.recordset[0],
      }, { status: 400 });
    }

    // Gerar boleto via BTG
    const btgBoleto = await generateBTGBoleto({
      payerName: billing.customer_name,
      payerDocument: billing.customer_document,
      payerEmail: billing.customer_email,
      valor: billing.total_amount,
      dataVencimento: billing.due_date.toISOString().split("T")[0],
      seuNumero: billing.invoice_number,
      descricao: `Fatura ${billing.invoice_number} - Serviços de Transporte`,
      instrucoes: "Não receber após o vencimento",
    });

    // Salvar no banco
    const result = await pool.request().query(`
      INSERT INTO btg_boletos (
        organization_id, nosso_numero, seu_numero,
        customer_id, payer_name, payer_document,
        valor_nominal, data_emissao, data_vencimento,
        status, btg_id, linha_digitavel, codigo_barras, pdf_url,
        billing_invoice_id,
        created_by, created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${session.user.organizationId},
        '${btgBoleto.nosso_numero}',
        '${billing.invoice_number}',
        ${billing.customer_id},
        '${billing.customer_name}',
        '${billing.customer_document}',
        ${billing.total_amount},
        GETDATE(),
        '${billing.due_date.toISOString()}',
        'REGISTERED',
        '${btgBoleto.id}',
        '${btgBoleto.linha_digitavel}',
        '${btgBoleto.codigo_barras}',
        '${btgBoleto.pdf_url}',
        ${billingId},
        '${session.user.id}',
        GETDATE()
      )
    `);

    // Atualizar fatura com boleto
    await pool.request().query(`
      UPDATE billing_invoices
      SET 
        boleto_url = '${btgBoleto.pdf_url}',
        boleto_linha_digitavel = '${btgBoleto.linha_digitavel}',
        updated_at = GETDATE()
      WHERE id = ${billingId}
    `);

    return NextResponse.json({
      success: true,
      message: "Boleto BTG gerado com sucesso!",
      boleto: result.recordset[0],
      btgData: btgBoleto,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao gerar boleto BTG para fatura:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}








