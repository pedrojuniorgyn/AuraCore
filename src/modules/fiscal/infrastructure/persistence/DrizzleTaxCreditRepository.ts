/**
 * Drizzle Tax Credit Repository
 * 
 * Implementação do repositório de créditos tributários usando Drizzle ORM
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 3/8 - tax-credit-engine.ts → TaxCreditCalculator
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Result } from "@/shared/domain";
import { Money } from "@/shared/domain";
import type { ITaxCreditRepository, ChartAccount } from '@/modules/fiscal/domain/ports/output/ITaxCreditRepository';
import type { TaxCredit } from "@/modules/fiscal/domain/value-objects/TaxCredit";
import type { FiscalDocumentData } from "@/modules/fiscal/domain/services/TaxCreditCalculator";

import { logger } from '@/shared/infrastructure/logging';
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SQL RESULT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface FiscalDocumentQueryResult {
  id: bigint;
  gross_amount: string;
  net_amount: string;
  document_type: string;
  cfop: string;
  ncm_code: string | null;
}

interface ChartOfAccountsResult {
  id: bigint;
  code: string;
  name: string;
}

interface JournalEntryInsertResult {
  id: bigint;
}

interface PendingDocumentResult {
  id: bigint;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPOSITORY IMPLEMENTATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class DrizzleTaxCreditRepository implements ITaxCreditRepository {
  async getFiscalDocumentData(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<FiscalDocumentData | null, Error>> {
    try {
      const docResult = await db.execute(sql`
        SELECT 
          fd.id,
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
        GROUP BY fd.id, fd.gross_amount, fd.net_amount, fd.document_type, fd.cfop, fdi.ncm_code
      `);

      const docData = (docResult.recordset || docResult) as unknown as FiscalDocumentQueryResult[];
      const doc = docData[0];

      if (!doc) {
        return Result.ok(null);
      }

      const moneyResult = Money.create(parseFloat(doc.net_amount || "0"), "BRL");
      
      if (Result.isFail(moneyResult)) {
        return Result.fail(new Error(`Erro ao criar Money: ${moneyResult.error}`));
      }

      const fiscalDocumentData: FiscalDocumentData = {
        id: doc.id,
        netAmount: moneyResult.value,
        cfop: doc.cfop || "",
        documentType: doc.document_type,
      };

      return Result.ok(fiscalDocumentData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar dados do documento fiscal: ${errorMessage}`));
    }
  }

  async getCreditAccounts(organizationId: bigint): Promise<Result<{
    pisAccount: ChartAccount;
    cofinsAccount: ChartAccount;
  }, Error>> {
    try {
      const accountsResult = await db.execute(sql`
        SELECT id, code, name 
        FROM chart_of_accounts
        WHERE organization_id = ${organizationId}
          AND code IN ('1.1.4.01.001', '1.1.4.01.002')
          AND deleted_at IS NULL
      `);

      const accounts = (accountsResult.recordset || accountsResult) as unknown as ChartOfAccountsResult[];
      const pisAccount = accounts.find((a) => a.code === '1.1.4.01.001');
      const cofinsAccount = accounts.find((a) => a.code === '1.1.4.01.002');

      if (!pisAccount || !cofinsAccount) {
        return Result.fail(new Error("Contas de crédito PIS/COFINS não encontradas"));
      }

      return Result.ok({
        pisAccount,
        cofinsAccount,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar contas de crédito: ${errorMessage}`));
    }
  }

  async registerCredit(
    credit: TaxCredit,
    userId: string,
    organizationId: bigint
  ): Promise<Result<boolean, Error>> {
    try {
      // 1. Buscar contas de crédito
      const accountsResult = await this.getCreditAccounts(organizationId);

      if (Result.isFail(accountsResult)) {
        return Result.fail(accountsResult.error);
      }

      const { pisAccount, cofinsAccount } = accountsResult.value;
      
      // ✅ S1.3-APP: Obter totalCredit (agora é método que retorna Result)
      const totalCreditResult = credit.getTotalCredit();
      if (Result.isFail(totalCreditResult)) {
        return Result.fail(new Error(`Erro ao obter total crédito: ${totalCreditResult.error}`));
      }
      const totalCreditAmount = totalCreditResult.value.amount;

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
          ${totalCreditAmount},
          ${totalCreditAmount},
          'POSTED',
          ${userId},
          ${userId}
        )
      `);

      const entryData = (entryResult.recordset || entryResult) as unknown as JournalEntryInsertResult[];
      const entry = entryData[0];

      if (!entry?.id) {
        return Result.fail(new Error("Falha ao criar journal_entry"));
      }

      const entryId = entry.id;

      // 3. Buscar conta de contrapartida (Custo da Mercadoria)
      // TODO: Buscar dinamicamente do plano de contas (4.1.x.xx.xxx)
      const costAccountResult = await db.execute(sql`
        SELECT TOP 1 id, code, name 
        FROM chart_of_accounts
        WHERE organization_id = ${organizationId}
          AND code LIKE '4.1%'
          AND name LIKE '%Custo%Mercadoria%'
          AND deleted_at IS NULL
      `);

      const costAccounts = (costAccountResult.recordset || costAccountResult) as unknown as ChartOfAccountsResult[];
      const costAccount = costAccounts[0];

      if (!costAccount) {
        return Result.fail(new Error("Conta de Custo da Mercadoria não encontrada (4.1.x)"));
      }

      // 4. Criar linhas de lançamento - PARTIDAS DOBRADAS
      // DÉBITO: PIS a Recuperar (Ativo ↑)
      // DÉBITO: COFINS a Recuperar (Ativo ↑)
      // CRÉDITO: Custo da Mercadoria (Resultado ↓)
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
        (${entryId}, ${organizationId}, 1, ${pisAccount.id}, ${credit.pisCredit.amount}, 0, 'Crédito PIS a Recuperar'),
        (${entryId}, ${organizationId}, 2, ${cofinsAccount.id}, ${credit.cofinsCredit.amount}, 0, 'Crédito COFINS a Recuperar'),
        (${entryId}, ${organizationId}, 3, ${costAccount.id}, 0, ${totalCreditAmount}, 'Redução Custo - Recuperação PIS/COFINS')
      `);

      // 5. Validar balanceamento (Débitos = Créditos)
      const totalDebits = credit.pisCredit.amount + credit.cofinsCredit.amount;
      const totalCredits = totalCreditAmount;

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return Result.fail(
          new Error(`Lançamento desbalanceado: Débitos=${totalDebits.toFixed(2)}, Créditos=${totalCredits.toFixed(2)}`)
        );
      }

      logger.info(`✅ Crédito fiscal registrado (balanceado): R$ ${totalCreditAmount.toFixed(2)}`);
      logger.info(`   D - PIS a Recuperar: R$ ${credit.pisCredit.amount.toFixed(2)}`);
      logger.info(`   D - COFINS a Recuperar: R$ ${credit.cofinsCredit.amount.toFixed(2)}`);
      logger.info(`   C - ${costAccount.name}: R$ ${totalCredits.toFixed(2)}`);
      
      return Result.ok(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao registrar crédito: ${errorMessage}`));
    }
  }

  async getPendingDocuments(organizationId: bigint): Promise<Result<bigint[], Error>> {
    try {
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

      const docs = (pendingDocsResult.recordset || pendingDocsResult) as unknown as PendingDocumentResult[];
      const documentIds = docs.map((doc) => doc.id);

      return Result.ok(documentIds);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar documentos pendentes: ${errorMessage}`));
    }
  }
}

/**
 * Factory para criar repositório
 */
export function createTaxCreditRepository(): DrizzleTaxCreditRepository {
  return new DrizzleTaxCreditRepository();
}

