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
  OrganizationData,
  PartnerData,
  ProductData,
  InvoiceData,
  CteData,
  ApurationData,
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
}

/**
 * Factory: Create SPED Data Repository
 */
export function createSpedDataRepository(): DrizzleSpedDataRepository {
  return new DrizzleSpedDataRepository();
}

