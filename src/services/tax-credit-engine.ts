/**
 * 🔍 TAX CREDIT ENGINE
 * Motor de Crédito Fiscal PIS/COFINS (Regime Não-Cumulativo)
 * 
 * Calcula automaticamente créditos tributários sobre:
 * - Diesel (4.1.1.01.001)
 * - Fretes Subcontratados (4.1.2.01.001)
 * - Pedágios (4.1.1.04.001)
 * - Depreciação (parcelas mensais de ativos)
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Alíquotas PIS/COFINS (Regime Não-Cumulativo)
const TAX_RATES = {
  PIS: 1.65,      // 1.65%
  COFINS: 7.6,    // 7.6%
  TOTAL: 9.25     // 9.25%
};

// Contas que geram crédito automático
const CREDIT_ELIGIBLE_ACCOUNTS = [
  '4.1.1.01.001', // Diesel
  '4.1.1.01.002', // Arla 32
  '4.1.1.01.003', // Óleos e Lubrificantes
  '4.1.2.01.001', // Frete Carreteiro
  '4.1.2.01.002', // Frete Transportadora
  '4.1.1.04.001', // Pedágio
];

export interface TaxCreditCalculation {
  fiscalDocumentId?: bigint;
  purchaseAmount: number;
  pisCredit: number;
  cofinsCredit: number;
  totalCredit: number;
  accountCode: string;
  accountName: string;
}

/**
 * Calcula crédito de PIS/COFINS para um documento fiscal de entrada
 */
export async function calculateTaxCreditsForDocument(
  fiscalDocumentId: bigint,
  organizationId: bigint
): Promise<TaxCreditCalculation | null> {
  try {
    // 1. Buscar dados do documento fiscal
    const docResult = await db.execute(sql`
      SELECT 
        fd.gross_amount,
        fd.net_amount,
        fd.document_type,
        fd.cfop,
        fdi.ncm_code
      FROM fiscal_documents fd
      LEFT JOIN fiscal_document_items fdi ON fdi.fiscal_document_id = fd.id
      WHERE fd.id = ${fiscalDocumentId}
        AND fd.organization_id = ${organizationId}
        AND fd.deleted_at IS NULL
      GROUP BY fd.gross_amount, fd.net_amount, fd.document_type, fd.cfop, fdi.ncm_code
    `);

    if (!docResult[0]) {
      return null;
    }

    const doc = docResult[0];
    const netAmount = parseFloat(doc.net_amount || "0");

    // 2. Determinar se é elegível para crédito
    // Regra: NFe de entrada (CFOP iniciando com 1, 2 ou 3)
    const cfop = doc.cfop || "";
    const firstDigit = cfop.charAt(0);
    
    if (!["1", "2", "3"].includes(firstDigit)) {
      return null; // Não é entrada
    }

    // 3. Calcular créditos
    const pisCredit = (netAmount * TAX_RATES.PIS) / 100;
    const cofinsCredit = (netAmount * TAX_RATES.COFINS) / 100;
    const totalCredit = pisCredit + cofinsCredit;

    return {
      fiscalDocumentId,
      purchaseAmount: netAmount,
      pisCredit,
      cofinsCredit,
      totalCredit,
      accountCode: cfop,
      accountName: doc.document_type,
    };
  } catch (error) {
    console.error("❌ Erro ao calcular créditos:", error);
    return null;
  }
}

/**
 * Registra crédito de PIS/COFINS no Plano de Contas
 */
export async function registerTaxCredit(
  credit: TaxCreditCalculation,
  userId: string,
  organizationId: bigint
): Promise<boolean> {
  try {
    // 1. Buscar contas de crédito (PCC)
    const accountsResult = await db.execute(sql`
      SELECT id, code, name 
      FROM chart_of_accounts
      WHERE organization_id = ${organizationId}
        AND code IN ('1.1.4.01.001', '1.1.4.01.002')
        AND deleted_at IS NULL
    `);

    const pisAccount = accountsResult.find((a: any) => a.code === '1.1.4.01.001');
    const cofinsAccount = accountsResult.find((a: any) => a.code === '1.1.4.01.002');

    if (!pisAccount || !cofinsAccount) {
      console.error("❌ Contas de crédito PIS/COFINS não encontradas");
      return false;
    }

    // 2. Criar lançamento contábil (journal_entry)
    const entryResult = await db.execute(sql`
      INSERT INTO journal_entries (
        organization_id,
        branch_id,
        entry_number,
        entry_date,
        source_type,
        source_id,
        description,
        total_debit,
        total_credit,
        status,
        created_by,
        updated_by
      )
      OUTPUT INSERTED.id
      VALUES (
        ${organizationId},
        1,
        'CRED-' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'),
        GETDATE(),
        'TAX_CREDIT',
        ${credit.fiscalDocumentId || null},
        'Crédito PIS/COFINS - ' + ${credit.accountName},
        ${credit.totalCredit},
        ${credit.totalCredit},
        'POSTED',
        ${userId},
        ${userId}
      )
    `);

    const entryId = entryResult[0]?.id;

    if (!entryId) {
      throw new Error("Falha ao criar journal_entry");
    }

    // 3. Criar linhas de lançamento (D: Crédito PIS/COFINS)
    await db.execute(sql`
      INSERT INTO journal_entry_lines (
        journal_entry_id,
        organization_id,
        line_number,
        chart_account_id,
        debit_amount,
        credit_amount,
        description
      )
      VALUES 
      (${entryId}, ${organizationId}, 1, ${pisAccount.id}, ${credit.pisCredit}, 0, 'Crédito PIS'),
      (${entryId}, ${organizationId}, 2, ${cofinsAccount.id}, ${credit.cofinsCredit}, 0, 'Crédito COFINS')
    `);

    console.log(`✅ Crédito fiscal registrado: R$ ${credit.totalCredit.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao registrar crédito:", error);
    return false;
  }
}

/**
 * Processa créditos fiscais para documentos pendentes
 */
export async function processPendingTaxCredits(
  organizationId: bigint,
  userId: string
): Promise<{ processed: number; totalCredit: number }> {
  try {
    // Buscar documentos fiscais sem crédito processado
    const pendingDocsResult = await db.execute(sql`
      SELECT id 
      FROM fiscal_documents
      WHERE organization_id = ${organizationId}
        AND fiscal_status = 'CLASSIFIED'
        AND deleted_at IS NULL
        AND id NOT IN (
          SELECT source_id 
          FROM journal_entries 
          WHERE source_type = 'TAX_CREDIT' 
            AND source_id IS NOT NULL
        )
    `);

    let processed = 0;
    let totalCredit = 0;

    for (const doc of (pendingDocsResult.recordset || [])) {
      const credit = await calculateTaxCreditsForDocument(doc.id, organizationId);
      
      if (credit && credit.totalCredit > 0) {
        const success = await registerTaxCredit(credit, userId, organizationId);
        if (success) {
          processed++;
          totalCredit += credit.totalCredit;
        }
      }
    }

    return { processed, totalCredit };
  } catch (error) {
    console.error("❌ Erro ao processar créditos pendentes:", error);
    return { processed: 0, totalCredit: 0 };
  }
}

/**
 * Calcula crédito de depreciação (parcelas mensais)
 */
export async function calculateDepreciationCredit(
  assetId: bigint,
  depreciationMonths: number = 48
): Promise<number> {
  // Crédito de PIS/COFINS sobre depreciação = 9.25% do valor do ativo / 48 meses
  // Implementação futura quando tivermos módulo de ativos completo
  return 0;
}




