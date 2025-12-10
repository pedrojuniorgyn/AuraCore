/**
 * 💰 GERADOR DE CONTAS A PAGAR A PARTIR DE NFe
 * 
 * Usa classificação automática por NCM (Opção C - Agrupado)
 * Cria N contas a pagar (1 por categoria) + detalhamento de itens
 */

import { db } from "@/lib/db";
import { accountsPayable, payableItems, inboundInvoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { groupItemsByCategory, generatePayableDescription, generateDocumentNumber } from "../accounting/group-by-category";
import type { ParsedNFe } from "../nfe-parser";

export interface PayableGenerationResult {
  success: boolean;
  payablesCreated: number;
  totalAmount: number;
  payableIds: number[];
  error?: string;
}

/**
 * Cria contas a pagar a partir de uma NFe de compra (PURCHASE)
 * 
 * Fluxo:
 * 1. Agrupa itens por categoria (NCM)
 * 2. Cria 1 conta a pagar por grupo
 * 3. Salva detalhamento de itens (payable_items)
 */
export async function createPayablesFromNFe(
  nfe: ParsedNFe,
  nfeId: number,
  organizationId: number,
  branchId: number,
  partnerId: number,
  userId: string
): Promise<PayableGenerationResult> {
  try {
    console.log(`💰 Gerando contas a pagar para NFe ${nfe.number}...`);

    // Verifica se já existem contas para esta NFe
    const existing = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, organizationId),
          eq(accountsPayable.inboundInvoiceId, nfeId)
        )
      );

    if (existing.length > 0) {
      console.log(`⚠️  Contas a pagar já existem para NFe ${nfe.number}`);
      return {
        success: false,
        payablesCreated: 0,
        totalAmount: 0,
        payableIds: [],
        error: "DUPLICATE_PAYABLES",
      };
    }

    // Agrupa itens por categoria (Opção C - NCM Agrupado)
    const groups = await groupItemsByCategory(
      nfe.items as any,
      organizationId,
      partnerId,
      "PURCHASE"
    );

    if (groups.length === 0) {
      console.log(`⚠️  Nenhum grupo de categoria encontrado para NFe ${nfe.number}`);
      return {
        success: false,
        payablesCreated: 0,
        totalAmount: 0,
        payableIds: [],
        error: "NO_CATEGORIES",
      };
    }

    const payableIds: number[] = [];
    let totalAmount = 0;

    // Para cada grupo, cria 1 conta a pagar
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Gera descrição e número do documento
      const description = generatePayableDescription(group, nfe.number, nfe.issuer.name);
      const documentNumber = generateDocumentNumber(nfe.number, i, groups.length);

      // Define vencimento
      let dueDate = nfe.issueDate;
      
      // Se tem informações de pagamento, usa a primeira parcela
      if (nfe.payment && nfe.payment.installments.length > 0) {
        dueDate = nfe.payment.installments[0].dueDate;
      }

      // Cria conta a pagar
      await db.insert(accountsPayable).values({
        organizationId,
        branchId,
        partnerId,
        categoryId: group.categoryId,
        chartAccountId: group.chartAccountId,
        costCenterId: group.costCenterId,
        inboundInvoiceId: nfeId,
        description,
        documentNumber,
        issueDate: nfe.issueDate,
        dueDate,
        amount: group.totalAmount.toString(),
        amountPaid: "0.00",
        discount: "0.00",
        interest: "0.00",
        fine: "0.00",
        status: "OPEN",
        origin: "FISCAL_NFE",
        notes: `Conta gerada automaticamente via classificação NCM. ${group.itemCount} item(ns).`,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      });

      // Busca ID criado
      const [newPayable] = await db
        .select()
        .from(accountsPayable)
        .where(
          and(
            eq(accountsPayable.organizationId, organizationId),
            eq(accountsPayable.documentNumber, documentNumber)
          )
        );

      if (newPayable) {
        payableIds.push(newPayable.id);
        totalAmount += group.totalAmount;

        // Salva itens detalhados (payable_items)
        for (const item of group.items) {
          await db.insert(payableItems).values({
            organizationId,
            payableId: newPayable.id,
            itemNumber: item.itemNumber,
            ncm: item.ncm,
            productCode: item.productCode || "",
            productName: item.productName,
            ean: item.ean,
            cfop: item.cfop || "",
            cst: item.cst,
            unit: item.unit,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            totalPrice: item.totalPrice.toString(),
            createdBy: userId,
          });
        }

        console.log(`  ✅ Conta ${documentNumber}: ${group.categoryName} = R$ ${group.totalAmount.toFixed(2)}`);
      }
    }

    console.log(`✅ ${payableIds.length} conta(s) a pagar criada(s) - Total: R$ ${totalAmount.toFixed(2)}`);

    return {
      success: true,
      payablesCreated: payableIds.length,
      totalAmount,
      payableIds,
    };

  } catch (error: any) {
    console.error("❌ Erro ao gerar contas a pagar:", error);
    return {
      success: false,
      payablesCreated: 0,
      totalAmount: 0,
      payableIds: [],
      error: error.message,
    };
  }
}





