/**
 * Drizzle Journal Entry Repository
 * 
 * Implementação do repositório de lançamentos contábeis usando Drizzle ORM
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Result } from "@/shared/domain";
import type {
  IJournalEntryRepository,
  FiscalDocumentData,
  FiscalDocumentItem,
  ChartAccount,
  JournalEntryData,
} from "@/modules/accounting/domain/ports";
import type { JournalLine } from "@/modules/accounting/domain/value-objects";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SQL RESULT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface FiscalDocumentQueryResult {
  id: bigint;
  organization_id: bigint;
  branch_id: bigint;
  document_type: string;
  document_number: string;
  issue_date: Date;
  net_amount: string;
  fiscal_classification: string;
  accounting_status: string;
}

interface FiscalDocumentItemQueryResult {
  id: bigint;
  chart_account_id: bigint | null;
  chart_account_code: string | null;
  chart_account_name: string | null;
  net_amount: string;
}

interface ChartAccountQueryResult {
  id: bigint;
  code: string;
  name: string;
  is_analytical: boolean;
}

interface JournalEntryQueryResult {
  id: bigint;
  organization_id: bigint;
  branch_id: bigint;
  fiscal_document_id: bigint | null;
  entry_type: string;
  entry_date: Date;
  description: string;
  total_debit: string;
  total_credit: string;
  status: string;
  created_by: string;
}

interface InsertIdResult {
  id: bigint;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPOSITORY IMPLEMENTATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class DrizzleJournalEntryRepository implements IJournalEntryRepository {
  async getFiscalDocumentData(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<FiscalDocumentData | null, Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          organization_id,
          branch_id,
          document_type,
          document_number,
          issue_date,
          net_amount,
          fiscal_classification,
          accounting_status
        FROM fiscal_documents
        WHERE id = ${fiscalDocumentId}
          AND organization_id = ${organizationId}
          AND deleted_at IS NULL
      `);

      const rows = (result.recordset || result) as unknown as FiscalDocumentQueryResult[];
      const doc = rows[0];

      if (!doc) {
        return Result.ok(null);
      }

      return Result.ok({
        id: doc.id,
        organizationId: doc.organization_id,
        branchId: doc.branch_id,
        documentType: doc.document_type,
        documentNumber: doc.document_number,
        issueDate: doc.issue_date,
        netAmount: parseFloat(doc.net_amount),
        fiscalClassification: doc.fiscal_classification,
        accountingStatus: doc.accounting_status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar documento fiscal: ${errorMessage}`));
    }
  }

  async getFiscalDocumentItems(
    fiscalDocumentId: bigint
  ): Promise<Result<FiscalDocumentItem[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          fdi.id,
          fdi.chart_account_id,
          fdi.net_amount,
          coa.code AS chart_account_code,
          coa.name AS chart_account_name
        FROM fiscal_document_items fdi
        LEFT JOIN chart_of_accounts coa ON coa.id = fdi.chart_account_id
        WHERE fdi.fiscal_document_id = ${fiscalDocumentId}
          AND fdi.deleted_at IS NULL
      `);

      const rows = (result.recordset || result) as unknown as FiscalDocumentItemQueryResult[];

      const items: FiscalDocumentItem[] = rows.map(row => ({
        id: row.id,
        chartAccountId: row.chart_account_id,
        chartAccountCode: row.chart_account_code,
        chartAccountName: row.chart_account_name,
        netAmount: parseFloat(row.net_amount),
      }));

      return Result.ok(items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar itens do documento: ${errorMessage}`));
    }
  }

  async getChartAccountById(
    accountId: bigint,
    organizationId: bigint
  ): Promise<Result<ChartAccount | null, Error>> {
    try {
      const result = await db.execute(sql`
        SELECT id, code, name, is_analytical
        FROM chart_of_accounts
        WHERE id = ${accountId}
          AND organization_id = ${organizationId}
          AND deleted_at IS NULL
      `);

      const rows = (result.recordset || result) as unknown as ChartAccountQueryResult[];
      const account = rows[0];

      if (!account) {
        return Result.ok(null);
      }

      return Result.ok({
        id: account.id,
        code: account.code,
        name: account.name,
        isAnalytical: account.is_analytical,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar conta contábil: ${errorMessage}`));
    }
  }

  async getAnalyticalAccounts(
    parentAccountId: bigint,
    organizationId: bigint
  ): Promise<Result<ChartAccount[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT TOP 5 id, code, name, is_analytical
        FROM chart_of_accounts
        WHERE parent_id = ${parentAccountId}
          AND is_analytical = 1
          AND deleted_at IS NULL
        ORDER BY code ASC
      `);

      const rows = (result.recordset || result) as unknown as ChartAccountQueryResult[];

      const accounts: ChartAccount[] = rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        isAnalytical: row.is_analytical,
      }));

      return Result.ok(accounts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar contas analíticas: ${errorMessage}`));
    }
  }

  async getCounterpartAccount(
    organizationId: bigint,
    fiscalClassification: string
  ): Promise<Result<ChartAccount | null, Error>> {
    try {
      // PURCHASE → Fornecedores (2.1.01%)
      // SALE → Clientes (1.1.01%)
      const accountCodePattern = fiscalClassification === "PURCHASE" ? "2.1.01%" : "1.1.01%";

      const result = await db.execute(sql`
        SELECT TOP 1 id, code, name, is_analytical
        FROM chart_of_accounts
        WHERE organization_id = ${organizationId}
          AND code LIKE ${accountCodePattern}
          AND deleted_at IS NULL
        ORDER BY code ASC
      `);

      const rows = (result.recordset || result) as unknown as ChartAccountQueryResult[];
      const account = rows[0];

      if (!account) {
        return Result.ok(null);
      }

      return Result.ok({
        id: account.id,
        code: account.code,
        name: account.name,
        isAnalytical: account.is_analytical,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar conta de contrapartida: ${errorMessage}`));
    }
  }

  async createJournalEntry(
    entry: Omit<JournalEntryData, 'id'>
  ): Promise<Result<bigint, Error>> {
    try {
      const result = await db.execute(sql`
        INSERT INTO journal_entries (
          organization_id,
          branch_id,
          fiscal_document_id,
          entry_type,
          entry_date,
          description,
          total_debit,
          total_credit,
          status,
          created_by,
          created_at
        )
        OUTPUT INSERTED.id
        VALUES (
          ${entry.organizationId},
          ${entry.branchId},
          ${entry.fiscalDocumentId},
          ${entry.entryType},
          ${entry.entryDate},
          ${entry.description},
          ${entry.totalDebit},
          ${entry.totalCredit},
          ${entry.status},
          ${entry.createdBy},
          GETDATE()
        )
      `);

      const rows = (result.recordset || result) as unknown as InsertIdResult[];
      const insertedId = rows[0]?.id;

      if (!insertedId) {
        return Result.fail(new Error("Falha ao criar lançamento contábil"));
      }

      return Result.ok(insertedId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao criar lançamento contábil: ${errorMessage}`));
    }
  }

  async createJournalEntryLines(
    journalEntryId: bigint,
    lines: JournalLine[]
  ): Promise<Result<void, Error>> {
    try {
      for (const line of lines) {
        await db.execute(sql`
          INSERT INTO journal_entry_lines (
            journal_entry_id,
            line_number,
            entry_type,
            chart_account_id,
            description,
            debit_amount,
            credit_amount,
            created_at
          )
          VALUES (
            ${journalEntryId},
            ${line.lineNumber},
            ${line.type},
            ${line.accountId},
            ${line.description},
            ${line.debitAmount},
            ${line.creditAmount},
            GETDATE()
          )
        `);
      }

      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao criar linhas do lançamento: ${errorMessage}`));
    }
  }

  async updateFiscalDocumentAccountingStatus(
    fiscalDocumentId: bigint,
    journalEntryId: bigint,
    status: string
  ): Promise<Result<void, Error>> {
    try {
      await db.execute(sql`
        UPDATE fiscal_documents
        SET 
          journal_entry_id = ${journalEntryId},
          accounting_status = ${status},
          updated_at = GETDATE()
        WHERE id = ${fiscalDocumentId}
      `);

      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao atualizar status contábil: ${errorMessage}`));
    }
  }

  async getJournalEntryById(
    journalEntryId: bigint
  ): Promise<Result<JournalEntryData | null, Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          organization_id,
          branch_id,
          fiscal_document_id,
          entry_type,
          entry_date,
          description,
          total_debit,
          total_credit,
          status,
          created_by
        FROM journal_entries
        WHERE id = ${journalEntryId}
      `);

      const rows = (result.recordset || result) as unknown as JournalEntryQueryResult[];
      const entry = rows[0];

      if (!entry) {
        return Result.ok(null);
      }

      return Result.ok({
        id: entry.id,
        organizationId: entry.organization_id,
        branchId: entry.branch_id,
        fiscalDocumentId: entry.fiscal_document_id,
        entryType: entry.entry_type,
        entryDate: entry.entry_date,
        description: entry.description,
        totalDebit: parseFloat(entry.total_debit),
        totalCredit: parseFloat(entry.total_credit),
        status: entry.status,
        createdBy: entry.created_by,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao buscar lançamento contábil: ${errorMessage}`));
    }
  }

  async reverseJournalEntry(
    journalEntryId: bigint,
    userId: string
  ): Promise<Result<void, Error>> {
    try {
      // 1. Atualizar status do lançamento
      await db.execute(sql`
        UPDATE journal_entries
        SET 
          status = 'REVERSED',
          reversed_at = GETDATE(),
          reversed_by = ${userId}
        WHERE id = ${journalEntryId}
      `);

      // 2. Buscar fiscal_document_id
      const entryResult = await db.execute(sql`
        SELECT fiscal_document_id
        FROM journal_entries
        WHERE id = ${journalEntryId}
      `);

      const entryRows = (entryResult.recordset || entryResult) as unknown as { fiscal_document_id: bigint | null }[];
      const fiscalDocumentId = entryRows[0]?.fiscal_document_id;

      // 3. Atualizar documento fiscal (se existir)
      if (fiscalDocumentId) {
        await db.execute(sql`
          UPDATE fiscal_documents
          SET 
            accounting_status = 'PENDING',
            updated_at = GETDATE()
          WHERE id = ${fiscalDocumentId}
        `);
      }

      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao reverter lançamento: ${errorMessage}`));
    }
  }
}

/**
 * Factory para criar repositório
 */
export function createJournalEntryRepository(): DrizzleJournalEntryRepository {
  return new DrizzleJournalEntryRepository();
}
