import { db, getFirstRowOrThrow, getDbRows } from "@/lib/db";
import { sql, eq, and, isNull } from "drizzle-orm";
import {
  fiscalDocuments,
  fiscalDocumentItems,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/schema";

/**
 * 📊 ACCOUNTING ENGINE SERVICE
 * 
 * Engine contábil para geração automática de lançamentos contábeis (partidas dobradas)
 */

export interface JournalEntryResult {
  success: boolean;
  journalEntryId?: number;
  totalDebit?: number;
  totalCredit?: number;
  lines?: number;
  error?: string;
}

// Database row interfaces
interface AccountRow {
  id: number;
  code: string;
  name: string;
  is_analytical: boolean;
  account_type?: string;
  parent_id?: number;
}

interface JournalEntryRow {
  id: number;
  status: string;
  entry_date: Date;
  entry_type?: string;
  description?: string;
  total_debit?: number;
  total_credit?: number;
}

interface FiscalDocumentItemRow {
  id: number;
  fiscal_document_id: number;
  chart_account_id: number | null;
  chart_account_code: string | null;
  chart_account_name: string | null;
  total_value: number;
  [key: string]: unknown;
}

/**
 * Gera lançamento contábil a partir de documento fiscal
 */
export async function generateJournalEntry(
  fiscalDocumentId: number,
  userId: string
): Promise<JournalEntryResult> {
  try {
    // 1. Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, fiscalDocumentId));

    if (!document) {
      throw new Error("Documento fiscal não encontrado");
    }

    // 2. Validar se já foi contabilizado
    if (document.accountingStatus === "POSTED") {
      throw new Error("Documento já possui lançamento contábil");
    }

    // 3. Buscar itens categorizados
    const items = await db.execute(sql`
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

    const itemsData = getDbRows<FiscalDocumentItemRow>(items);
    if (itemsData.length === 0) {
      throw new Error("Documento sem itens para contabilizar");
    }

    // 4. Criar lançamento principal
    const entryResult = await db.execute(sql`
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
      ) VALUES (
        ${document.organizationId},
        ${document.branchId},
        ${fiscalDocumentId},
        'FISCAL_DOCUMENT',
        ${document.issueDate},
        'Lançamento automático - ' + ${document.documentType} + ' ' + ${document.documentNumber},
        ${document.netAmount},
        ${document.netAmount},
        'POSTED',
        ${userId},
        GETDATE()
      );
      SELECT SCOPE_IDENTITY() AS id;
    `);

    const entry = getFirstRowOrThrow<JournalEntryRow>(entryResult, 'Failed to create journal entry (SCOPE_IDENTITY not returned)');
    const journalEntryId = entry.id;

    // 5. Criar linhas (partidas)
    let lineNumber = 1;

    // DÉBITOS: Uma linha por item (agrupado por plano de contas)
    for (const item of itemsData) {
      if (item.chart_account_id) {
        // ✅ VALIDAÇÃO: Verificar se conta é analítica
        const accountResult = await db.execute(sql`
          SELECT id, code, name, is_analytical
          FROM chart_of_accounts
          WHERE id = ${item.chart_account_id}
            AND deleted_at IS NULL
        `);

        const accountData = getDbRows<AccountRow>(accountResult);
        if (accountData.length === 0) {
          throw new Error(`Conta contábil ${item.chart_account_id} não encontrada`);
        }

        const account = accountData[0];

        // ✅ VALIDAÇÃO CRÍTICA: Bloquear lançamento em conta sintética
        if (!account.is_analytical) {
          // Buscar contas analíticas disponíveis
          const analyticalAccountsResult = await db.execute(sql`
            SELECT TOP 5 code, name
            FROM chart_of_accounts
            WHERE parent_id = ${item.chart_account_id}
              AND is_analytical = 1
              AND deleted_at IS NULL
            ORDER BY code ASC
          `);

          const analyticalAccounts = getDbRows<{ code: string; name: string }>(analyticalAccountsResult);
          const analyticalList = analyticalAccounts
            .map(a => `• ${a.code} - ${a.name}`)
            .join('\n');

          throw new Error(
            `❌ Conta "${account.code} - ${account.name}" é SINTÉTICA.\n\n` +
            `Lançamentos devem ser feitos em contas ANALÍTICAS:\n${analyticalList}\n\n` +
            `Regra: NBC TG 26 - Contas sintéticas apenas consolidam.`
          );
        }

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
          ) VALUES (
            ${journalEntryId},
            ${lineNumber++},
            'DEBIT',
            ${item.chart_account_id},
            ${item.chart_account_name || 'Sem descrição'},
            ${item.net_amount},
            0.00,
            GETDATE()
          )
        `);
      }
    }

    // CRÉDITO: Fornecedores a Pagar (ou Clientes a Receber)
    const creditAccountCode = document.fiscalClassification === "PURCHASE" 
      ? "2.1.01%" // Fornecedores
      : "1.1.01%"; // Clientes (Contas a Receber)

    const creditAccountResult = await db.execute(sql`
      SELECT TOP 1 id, code, name
      FROM chart_of_accounts
      WHERE organization_id = ${document.organizationId}
        AND code LIKE ${creditAccountCode}
        AND deleted_at IS NULL
      ORDER BY code ASC
    `);

    const creditAccountData = getDbRows<AccountRow>(creditAccountResult);
    if (creditAccountData.length > 0) {
      const creditAccount = creditAccountData[0];

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
        ) VALUES (
          ${journalEntryId},
          ${lineNumber},
          'CREDIT',
          ${creditAccount.id},
          ${creditAccount.name},
          0.00,
          ${document.netAmount},
          GETDATE()
        )
      `);
    }

    // 6. Atualizar documento fiscal
    await db.execute(sql`
      UPDATE fiscal_documents
      SET 
        journal_entry_id = ${journalEntryId},
        accounting_status = 'POSTED',
        updated_at = GETDATE()
      WHERE id = ${fiscalDocumentId}
    `);

    console.log(`✅ Lançamento contábil #${journalEntryId} gerado`);

    return {
      success: true,
      journalEntryId,
      totalDebit: parseFloat(document.netAmount),
      totalCredit: parseFloat(document.netAmount),
      lines: lineNumber,
    };
  } catch (error: unknown) {
    console.error("❌ Erro ao gerar lançamento:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Reverte lançamento contábil
 */
export async function reverseJournalEntry(
  journalEntryId: number,
  userId: string
): Promise<JournalEntryResult> {
  try {
    // 1. Buscar lançamento
    const entryResult = await db.execute(sql`
      SELECT * FROM journal_entries WHERE id = ${journalEntryId}
    `);

    const entryData = getDbRows<JournalEntryRow>(entryResult);
    if (entryData.length === 0) {
      throw new Error("Lançamento não encontrado");
    }

    const entry = entryData[0];

    // 2. Validar se pode reverter
    if (entry.status === "REVERSED") {
      throw new Error("Lançamento já foi revertido");
    }

    // 3. Atualizar status
    await db.execute(sql`
      UPDATE journal_entries
      SET 
        status = 'REVERSED',
        reversed_at = GETDATE(),
        reversed_by = ${userId}
      WHERE id = ${journalEntryId}
    `);

    // 4. Atualizar documento fiscal
    if (entry.fiscal_document_id) {
      await db.execute(sql`
        UPDATE fiscal_documents
        SET 
          accounting_status = 'PENDING',
          updated_at = GETDATE()
        WHERE id = ${entry.fiscal_document_id}
      `);
    }

    console.log(`✅ Lançamento #${journalEntryId} revertido`);

    return {
      success: true,
      journalEntryId,
    };
  } catch (error: unknown) {
    console.error("❌ Erro ao reverter lançamento:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
