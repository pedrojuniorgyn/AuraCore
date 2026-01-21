import { NextResponse } from "next/server";
import { db, getDbRows } from "@/lib/db";
import { inboundInvoices, accountsPayable, payableItems } from "@/lib/db/schema";
import { eq, isNull, sql } from "drizzle-orm";

/**
 * POST /api/admin/test-classification
 * Testar classificação automática de NFes existentes
 */
export async function POST() {
  try {
    console.log("🧪 [TEST] Iniciando teste de classificação automática...");

    // 1. Verificar NFes existentes
    const result = await db.execute(sql`
      SELECT TOP 100 *
      FROM inbound_invoices
      ORDER BY created_at DESC
    `);
    
    interface InvoiceRow {
      id: number;
      invoice_number?: string;
      invoiceNumber?: string;
      value?: number;
      totalValue?: number;
      total_value?: number;
      classification?: string;
      created_at?: Date;
      createdAt?: Date;
    }
    
    const allInvoices = getDbRows<InvoiceRow>(result as unknown as { recordset?: InvoiceRow[] });
    
    // Mapear para formato esperado
    const mappedInvoices = allInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number || inv.invoiceNumber,
      totalValue: inv.value || inv.totalValue || inv.total_value || 0,
      classification: inv.classification || null,
      createdAt: inv.created_at || inv.createdAt,
    }));

    console.log(`📊 [TEST] Total de NFes: ${mappedInvoices.length}`);

    // 2. Contar por classificação
    const classificationCount = {
      PURCHASE: mappedInvoices.filter((i) => i.classification === "PURCHASE").length,
      CARGO: mappedInvoices.filter((i) => i.classification === "CARGO").length,
      RETURN: mappedInvoices.filter((i) => i.classification === "RETURN").length,
      OTHER: mappedInvoices.filter((i) => i.classification === "OTHER").length,
      NULL: mappedInvoices.filter((i) => !i.classification).length,
    };

    console.log("📊 [TEST] Distribuição por classificação:");
    console.log(`  • PURCHASE (Compras): ${classificationCount.PURCHASE}`);
    console.log(`  • CARGO (Transporte): ${classificationCount.CARGO}`);
    console.log(`  • RETURN (Devoluções): ${classificationCount.RETURN}`);
    console.log(`  • OTHER (Outros): ${classificationCount.OTHER}`);
    console.log(`  • NULL (Sem classificação): ${classificationCount.NULL}`);

    // 3. Verificar contas a pagar geradas
    const payablesResult = await db.execute(sql`
      SELECT TOP 50
        id,
        document_number as documentNumber,
        amount,
        origin,
        status,
        created_at as createdAt
      FROM accounts_payable
      WHERE origin = 'INVOICE_IMPORT'
      ORDER BY created_at DESC
    `);
    
    interface PayableRow {
      id: number;
      document_number?: string;
      amount?: number;
      due_date?: Date;
      status?: string;
      createdAt?: Date;
    }
    
    const payables = getDbRows<PayableRow>(payablesResult as unknown as { recordset?: PayableRow[] });

    console.log(`💰 [TEST] Contas a pagar de NFe: ${payables.length}`);

    // 4. Verificar itens de contas a pagar
    const itemsResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM payable_items
    `);
    
    interface ItemCountRow {
      count?: number;
    }
    
    const items = getDbRows<ItemCountRow>(itemsResult);
    const itemsCount = items[0]?.count || 0;
    console.log(`📦 [TEST] Total de itens vinculados: ${itemsCount}`);

    // 5. Amostra de NFes recentes para exibição
    // NOTA: .slice() mantido - dados já limitados via TOP 100 no SQL
    // É amostragem de exibição (10 de 100), não paginação de listagem
    const recentInvoices = mappedInvoices.slice(0, 10).map((inv) => ({
      numero: inv.invoiceNumber,
      valor: `R$ ${inv.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      classificacao: inv.classification || "SEM CLASSIFICAÇÃO",
      data: inv.createdAt ? new Date(inv.createdAt).toLocaleString("pt-BR") : "N/A",
    }));

    // 6. Estatísticas de geração de contas a pagar
    const payableStats = payables.reduce(
      (acc, p) => {
        acc.total++;
        acc.totalAmount += (p.amount ?? 0);
        if (p.status === "PENDING") acc.pending++;
        if (p.status === "PAID") acc.paid++;
        return acc;
      },
      { total: 0, totalAmount: 0, pending: 0, paid: 0 }
    );

    console.log("💰 [TEST] Estatísticas de Contas a Pagar:");
    console.log(`  • Total: ${payableStats.total}`);
    console.log(`  • Pendentes: ${payableStats.pending}`);
    console.log(`  • Pagas: ${payableStats.paid}`);
    console.log(`  • Valor Total: R$ ${payableStats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);

    // 7. Validações
    const validations = {
      nfesWithClassification: mappedInvoices.filter((i) => i.classification).length,
      nfesWithoutClassification: classificationCount.NULL,
      payablesGenerated: payables.length,
      itemsLinked: itemsCount,
      percentageClassified: mappedInvoices.length > 0 
        ? ((mappedInvoices.filter((i) => i.classification).length / mappedInvoices.length) * 100).toFixed(1)
        : "0.0",
    };

    const report = {
      success: true,
      summary: {
        totalInvoices: mappedInvoices.length,
        classificationDistribution: classificationCount,
        payablesStats: payableStats,
        itemsCount: itemsCount,
        percentageClassified: `${validations.percentageClassified}%`,
      },
      validations,
      recentInvoices,
      status: validations.percentageClassified === "100.0" ? "✅ PERFEITO" : "⚠️ ATENÇÃO",
      message:
        validations.percentageClassified === "100.0"
          ? "Todas as NFes foram classificadas corretamente!"
          : `${classificationCount.NULL} NFe(s) sem classificação`,
    };

    console.log("✅ [TEST] Teste concluído!");

    return NextResponse.json(report, { status: 200 });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [TEST] Erro no teste:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

