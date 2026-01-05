/**
 * 📄 DRIZZLE SPED DATA REPOSITORY
 * 
 * Infrastructure adapter implementing ISpedDataRepository using Drizzle ORM
 * 
 * Responsibilities:
 * - All database interactions for SPED file generation
 * - SQL query execution
 * - Result mapping
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Result } from "@/shared/domain";
import {
  ISpedDataRepository,
  SpedFiscalPeriod,
  SpedEcdPeriod,
  SpedContributionsPeriod,
  OrganizationData,
  PartnerData,
  ProductData,
  InvoiceData,
  CteData,
  ApurationData,
  ChartAccountData,
  JournalEntryDataEcd,
  JournalEntryLineData,
  AccountBalanceData,
  CteContribData,
  NFeContribData,
  TaxTotalsContribData,
} from "../../domain/ports/ISpedDataRepository";

export class DrizzleSpedDataRepository implements ISpedDataRepository {
  async getOrganization(
    organizationId: bigint
  ): Promise<Result<OrganizationData, Error>> {
    try {
      const result = await db.execute(sql`
        SELECT name, document 
        FROM organizations 
        WHERE id = ${organizationId}
      `);

      const rows = (result.recordset || result) as unknown as OrganizationData[];

      if (rows.length === 0) {
        return Result.fail(new Error(`Organização ${organizationId} não encontrada`));
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar organização: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getPartners(
    period: SpedFiscalPeriod
  ): Promise<Result<PartnerData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT 
          bp.document,
          bp.legal_name as legalName,
          bp.fantasy_name as fantasyName,
          bp.address_street as addressStreet,
          bp.address_city as addressCity,
          bp.address_state as addressState,
          bp.address_zip_code as addressZipCode
        FROM business_partners bp
        INNER JOIN fiscal_documents fd ON fd.partner_id = bp.id
        WHERE fd.organization_id = ${period.organizationId}
          AND MONTH(fd.issue_date) = ${period.referenceMonth}
          AND YEAR(fd.issue_date) = ${period.referenceYear}
          AND fd.deleted_at IS NULL
        ORDER BY bp.document
      `);

      const rows = (result.recordset || result) as unknown as PartnerData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar parceiros: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getProducts(
    period: SpedFiscalPeriod
  ): Promise<Result<ProductData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT DISTINCT 
          p.id,
          p.code,
          p.name,
          p.ncm,
          p.unit
        FROM products p
        INNER JOIN fiscal_document_items fdi ON fdi.product_id = p.id
        INNER JOIN fiscal_documents fd ON fd.id = fdi.fiscal_document_id
        WHERE fd.organization_id = ${period.organizationId}
          AND MONTH(fd.issue_date) = ${period.referenceMonth}
          AND YEAR(fd.issue_date) = ${period.referenceYear}
          AND fd.deleted_at IS NULL
        ORDER BY p.code
      `);

      const rows = (result.recordset || result) as unknown as ProductData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar produtos: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getInvoices(
    period: SpedFiscalPeriod
  ): Promise<Result<InvoiceData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          fd.document_number as documentNumber,
          fd.access_key as accessKey,
          fd.issue_date as issueDate,
          bp.document as partnerDocument,
          fd.document_model as model,
          fd.series,
          fd.cfop,
          fd.net_amount as totalAmount,
          fd.tax_amount as taxAmount,
          fd.icms_base as icmsBase,
          fd.icms_amount as icmsAmount
        FROM fiscal_documents fd
        INNER JOIN business_partners bp ON bp.id = fd.partner_id
        WHERE fd.organization_id = ${period.organizationId}
          AND MONTH(fd.issue_date) = ${period.referenceMonth}
          AND YEAR(fd.issue_date) = ${period.referenceYear}
          AND fd.document_type = 'NFE'
          AND fd.operation_type = 'ENTRADA'
          AND fd.deleted_at IS NULL
        ORDER BY fd.issue_date, fd.document_number
      `);

      const rows = (result.recordset || result) as unknown as InvoiceData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar notas fiscais: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getCtes(period: SpedFiscalPeriod): Promise<Result<CteData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          cd.cte_number as cteNumber,
          cd.access_key as accessKey,
          cd.issue_date as issueDate,
          cd.customer_document as customerDocument,
          cd.cfop,
          cd.total_amount as totalAmount,
          cd.icms_amount as icmsAmount
        FROM cargo_documents cd
        WHERE cd.organization_id = ${period.organizationId}
          AND MONTH(cd.issue_date) = ${period.referenceMonth}
          AND YEAR(cd.issue_date) = ${period.referenceYear}
          AND cd.deleted_at IS NULL
        ORDER BY cd.issue_date, cd.cte_number
      `);

      const rows = (result.recordset || result) as unknown as CteData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar CTes: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getApuration(
    period: SpedFiscalPeriod
  ): Promise<Result<ApurationData, Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          SUM(CASE WHEN fd.operation_type = 'SAIDA' THEN fd.tax_amount ELSE 0 END) as icmsDebit,
          SUM(CASE WHEN fd.operation_type = 'ENTRADA' THEN fd.tax_amount ELSE 0 END) as icmsCredit
        FROM fiscal_documents fd
        WHERE fd.organization_id = ${period.organizationId}
          AND MONTH(fd.issue_date) = ${period.referenceMonth}
          AND YEAR(fd.issue_date) = ${period.referenceYear}
          AND fd.deleted_at IS NULL
      `);

      const rows = (result.recordset || result) as unknown as {
        icmsDebit: number | null;
        icmsCredit: number | null;
      }[];

      const apuration: ApurationData = {
        icmsDebit: rows[0]?.icmsDebit ?? 0,
        icmsCredit: rows[0]?.icmsCredit ?? 0,
      };

      return Result.ok(apuration);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar apuração: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  // ============================================================================
  // Métodos para SPED ECD (Contábil)
  // ============================================================================

  async getChartOfAccounts(
    period: SpedEcdPeriod
  ): Promise<Result<ChartAccountData[], Error>> {
    try {
      const result = await db.execute(sql`
        WITH RECURSIVE AccountHierarchy AS (
          -- Contas raiz
          SELECT 
            ca.code,
            ca.name,
            ca.type,
            CAST(NULL AS VARCHAR(50)) as parentCode,
            ca.is_analytical as isAnalytical
          FROM chart_of_accounts ca
          WHERE ca.organization_id = ${period.organizationId}
            AND ca.parent_id IS NULL
            AND ca.deleted_at IS NULL
          
          UNION ALL
          
          -- Contas filhas
          SELECT 
            ca.code,
            ca.name,
            ca.type,
            parent.code as parentCode,
            ca.is_analytical as isAnalytical
          FROM chart_of_accounts ca
          INNER JOIN AccountHierarchy parent ON parent.code = (
            SELECT code FROM chart_of_accounts WHERE id = ca.parent_id
          )
          WHERE ca.organization_id = ${period.organizationId}
            AND ca.deleted_at IS NULL
        )
        SELECT code, name, type, parentCode, isAnalytical
        FROM AccountHierarchy
        ORDER BY code
      `);

      const rows = (result.recordset || result) as unknown as ChartAccountData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar plano de contas: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getJournalEntries(
    period: SpedEcdPeriod
  ): Promise<Result<JournalEntryDataEcd[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          CAST(je.id AS VARCHAR(50)) as id,
          je.entry_number as entryNumber,
          je.entry_date as entryDate,
          je.description
        FROM journal_entries je
        WHERE je.organization_id = ${period.organizationId}
          AND YEAR(je.entry_date) = ${period.referenceYear}
          AND je.status = 'POSTED'
          AND je.deleted_at IS NULL
        ORDER BY je.entry_date, je.entry_number
      `);

      const rows = (result.recordset || result) as unknown as JournalEntryDataEcd[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar lançamentos contábeis: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getJournalEntryLines(
    entryId: string,
    period: SpedEcdPeriod
  ): Promise<Result<JournalEntryLineData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          jel.line_number as lineNumber,
          ca.code as accountCode,
          jel.debit_amount as debitAmount,
          jel.credit_amount as creditAmount,
          jel.description
        FROM journal_entry_lines jel
        INNER JOIN chart_of_accounts ca ON ca.id = jel.chart_account_id
        WHERE jel.journal_entry_id = ${entryId}
          AND ca.organization_id = ${period.organizationId}
        ORDER BY jel.line_number
      `);

      const rows = (result.recordset || result) as unknown as JournalEntryLineData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar partidas do lançamento: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getAccountBalances(
    period: SpedEcdPeriod
  ): Promise<Result<AccountBalanceData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          ca.code,
          ISNULL(SUM(jel.debit_amount), 0) as totalDebit,
          ISNULL(SUM(jel.credit_amount), 0) as totalCredit
        FROM chart_of_accounts ca
        LEFT JOIN journal_entry_lines jel ON jel.chart_account_id = ca.id
        LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
        WHERE ca.organization_id = ${period.organizationId}
          AND ca.deleted_at IS NULL
          AND (je.id IS NULL OR (
            YEAR(je.entry_date) = ${period.referenceYear} 
            AND je.status = 'POSTED'
            AND je.deleted_at IS NULL
          ))
        GROUP BY ca.code
        HAVING ISNULL(SUM(jel.debit_amount), 0) <> 0 OR ISNULL(SUM(jel.credit_amount), 0) <> 0
        ORDER BY ca.code
      `);

      const rows = (result.recordset || result) as unknown as AccountBalanceData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar saldos das contas: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  // ============================================================================
  // Métodos para SPED Contributions (PIS/COFINS)
  // ============================================================================

  async getCtesForContributions(
    period: SpedContributionsPeriod
  ): Promise<Result<CteContribData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          cd.cte_number as cteNumber,
          cd.access_key as accessKey,
          cd.issue_date as issueDate,
          cd.customer_document as customerDocument,
          cd.cfop,
          cd.total_amount as totalAmount,
          ISNULL(cd.icms_amount, 0) as icmsAmount
        FROM cargo_documents cd
        WHERE cd.organization_id = ${period.organizationId}
          AND MONTH(cd.issue_date) = ${period.referenceMonth}
          AND YEAR(cd.issue_date) = ${period.referenceYear}
          AND cd.deleted_at IS NULL
        ORDER BY cd.issue_date, cd.cte_number
      `);

      const rows = (result.recordset || result) as unknown as CteContribData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar CTes para Contribuições: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getNFesEntradaForContributions(
    period: SpedContributionsPeriod
  ): Promise<Result<NFeContribData[], Error>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          fd.document_number as documentNumber,
          fd.access_key as accessKey,
          fd.issue_date as issueDate,
          bp.document as partnerDocument,
          fd.net_amount as netAmount,
          fd.cfop
        FROM fiscal_documents fd
        INNER JOIN business_partners bp ON bp.id = fd.partner_id
        WHERE fd.organization_id = ${period.organizationId}
          AND MONTH(fd.issue_date) = ${period.referenceMonth}
          AND YEAR(fd.issue_date) = ${period.referenceYear}
          AND fd.document_type = 'NFE'
          AND fd.operation_type = 'ENTRADA'
          AND fd.deleted_at IS NULL
        ORDER BY fd.issue_date, fd.document_number
      `);

      const rows = (result.recordset || result) as unknown as NFeContribData[];

      return Result.ok(rows);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar NFes de entrada para Contribuições: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async getTaxTotalsContributions(
    period: SpedContributionsPeriod
  ): Promise<Result<TaxTotalsContribData, Error>> {
    try {
      // Retornar BASE DE CÁLCULO (não impostos calculados)
      // Débitos = CTes de saída (receitas de frete)
      // Créditos = NFes de entrada (compras - base = valor líquido - ICMS)
      
      // Buscar BASE de débitos (CTes de saída)
      const debitResult = await db.execute(sql`
        SELECT 
          ISNULL(SUM(CAST(cd.total_amount AS DECIMAL(18,2))), 0) as baseDebito
        FROM cargo_documents cd
        WHERE cd.organization_id = ${period.organizationId}
          AND MONTH(cd.issue_date) = ${period.referenceMonth}
          AND YEAR(cd.issue_date) = ${period.referenceYear}
          AND cd.deleted_at IS NULL
      `);

      const debitRows = (debitResult.recordset || debitResult) as unknown as {
        baseDebito: number;
      }[];

      const baseDebito = debitRows[0]?.baseDebito ?? 0;

      // Buscar BASE de créditos (NFes de entrada)
      // Base PIS/COFINS = valor líquido - ICMS (conforme legislação)
      const creditResult = await db.execute(sql`
        SELECT 
          ISNULL(SUM(
            CAST(fd.net_amount AS DECIMAL(18,2)) - ISNULL(CAST(fd.icms_amount AS DECIMAL(18,2)), 0)
          ), 0) as baseCredito
        FROM fiscal_documents fd
        WHERE fd.organization_id = ${period.organizationId}
          AND MONTH(fd.issue_date) = ${period.referenceMonth}
          AND YEAR(fd.issue_date) = ${period.referenceYear}
          AND fd.document_type = 'NFE'
          AND fd.operation_type = 'ENTRADA'
          AND fd.deleted_at IS NULL
      `);

      const creditRows = (creditResult.recordset || creditResult) as unknown as {
        baseCredito: number;
      }[];

      const baseCredito = creditRows[0]?.baseCredito ?? 0;

      const totals: TaxTotalsContribData = {
        baseDebito,
        baseCredito,
      };

      return Result.ok(totals);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar base de cálculo PIS/COFINS: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }
}

/**
 * Factory: Create SPED Data Repository
 */
export function createSpedDataRepository(): DrizzleSpedDataRepository {
  return new DrizzleSpedDataRepository();
}

