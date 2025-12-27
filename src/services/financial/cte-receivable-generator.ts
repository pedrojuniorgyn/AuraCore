/**
 * 💵 GERADOR DE CONTAS A RECEBER A PARTIR DE CTe
 * 
 * Cria duplicatas baseado nas condições de pagamento do cliente
 */

import { db } from "@/lib/db";
import { accountsReceivable, businessPartners, financialCategories, chartOfAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface ReceivableGenerationResult {
  success: boolean;
  receivablesCreated: number;
  totalAmount: number;
  receivableIds: number[];
  error?: string;
}

interface CTe {
  id: number;
  cte_number: string;
  total_service: number;
  issue_date: Date;
  sender_id?: number;
  recipient_id?: number;
  organization_id: number;
  branch_id: number;
}

/**
 * Parseia condições de pagamento do cliente
 * Exemplos: "0" = à vista, "30" = 30 dias, "30/60/90" = 3 parcelas
 */
function parsePaymentTerms(
  terms: string | null,
  totalAmount: number,
  issueDate: Date
): Array<{ number: string; dueDate: Date; amount: number }> {
  
  if (!terms || terms === "0") {
    // À vista
    return [{
      number: "001",
      dueDate: issueDate,
      amount: totalAmount,
    }];
  }

  const days = terms.split("/").map(d => parseInt(d.trim()));
  const amountPerInstallment = totalAmount / days.length;

  return days.map((dayOffset, index) => {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + dayOffset);

    return {
      number: String(index + 1).padStart(3, "0"),
      dueDate,
      amount: amountPerInstallment,
    };
  });
}

/**
 * Cria contas a receber a partir de um CTe autorizado
 */
export async function createReceivablesFromCTe(
  cte: CTe,
  userId: string
): Promise<ReceivableGenerationResult> {
  try {
    console.log(`💵 Gerando contas a receber para CTe ${cte.cte_number}...`);

    // Verifica se já existem contas para este CTe
    const existing = await db
      .select()
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.organizationId, cte.organization_id),
          eq(accountsReceivable.cteDocumentId, cte.id)
        )
      );

    if (existing.length > 0) {
      console.log(`⚠️  Contas a receber já existem para CTe ${cte.cte_number}`);
      return {
        success: false,
        receivablesCreated: 0,
        totalAmount: 0,
        receivableIds: [],
        error: "DUPLICATE_RECEIVABLES",
      };
    }

    // Identifica cliente (remetente ou destinatário)
    const clientId = cte.sender_id || cte.recipient_id;

    if (!clientId) {
      console.log(`⚠️  Cliente não identificado para CTe ${cte.cte_number}`);
      return {
        success: false,
        receivablesCreated: 0,
        totalAmount: 0,
        receivableIds: [],
        error: "NO_CLIENT",
      };
    }

    // Busca cliente e condições de pagamento
    const [client] = await db
      .select()
      .from(businessPartners)
      .where(eq(businessPartners.id, clientId));

    if (!client) {
      console.log(`⚠️  Cliente ${clientId} não encontrado`);
      return {
        success: false,
        receivablesCreated: 0,
        totalAmount: 0,
        receivableIds: [],
        error: "CLIENT_NOT_FOUND",
      };
    }

    // Busca categoria padrão de frete
    const [freightCategory] = await db
      .select()
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.organizationId, cte.organization_id),
          eq(financialCategories.name, "Receita de Frete")
        )
      );

    // Busca conta contábil padrão de frete
    const [freightAccount] = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.organizationId, cte.organization_id),
          eq(chartOfAccounts.code, "3.1.01.001")
        )
      );

    if (!freightCategory || !freightAccount) {
      console.log(`⚠️  Categoria ou conta de frete não encontrada`);
      return {
        success: false,
        receivablesCreated: 0,
        totalAmount: 0,
        receivableIds: [],
        error: "NO_FREIGHT_CATEGORY",
      };
    }

    // Parseia condições de pagamento
    const paymentTerms = client.paymentTerms || "0";
    const installments = parsePaymentTerms(paymentTerms, cte.total_service, cte.issue_date);

    const receivableIds: number[] = [];

    // Cria contas a receber (1 por parcela)
    for (const inst of installments) {
      const documentNumber = installments.length === 1
        ? `CTe ${cte.cte_number}`
        : `CTe ${cte.cte_number}-${inst.number}`;

      await db.insert(accountsReceivable).values({
        organizationId: cte.organization_id,
        branchId: cte.branch_id,
        partnerId: clientId,
        categoryId: freightCategory.id,
        chartAccountId: freightAccount.id,
        cteDocumentId: cte.id,
        description: `CTe ${cte.cte_number} - ${client.name} - Parcela ${inst.number}`,
        documentNumber,
        issueDate: cte.issue_date,
        dueDate: inst.dueDate,
        amount: inst.amount.toString(),
        amountReceived: "0.00",
        discount: "0.00",
        interest: "0.00",
        fine: "0.00",
        status: "OPEN",
        origin: "FISCAL_CTE",
        notes: `Conta gerada automaticamente do CTe ${cte.cte_number}`,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      });

      // Busca ID criado
      const [newReceivable] = await db
        .select()
        .from(accountsReceivable)
        .where(
          and(
            eq(accountsReceivable.organizationId, cte.organization_id),
            eq(accountsReceivable.documentNumber, documentNumber)
          )
        );

      if (newReceivable) {
        receivableIds.push(newReceivable.id);
        console.log(`  ✅ Conta ${documentNumber}: Venc. ${inst.dueDate.toLocaleDateString()} = R$ ${inst.amount.toFixed(2)}`);
      }
    }

    console.log(`✅ ${receivableIds.length} conta(s) a receber criada(s) - Total: R$ ${cte.total_service.toFixed(2)}`);

    return {
      success: true,
      receivablesCreated: receivableIds.length,
      totalAmount: cte.total_service,
      receivableIds,
    };

  } catch (error: any) {
    console.error("❌ Erro ao gerar contas a receber:", error);
    return {
      success: false,
      receivablesCreated: 0,
      totalAmount: 0,
      receivableIds: [],
      error: error.message,
    };
  }
}






















