/**
 * 💰 DRIZZLE FINANCIAL TITLE REPOSITORY
 * 
 * Infrastructure adapter implementing IFinancialTitleRepository using Drizzle ORM
 * 
 * Responsibilities:
 * - All database interactions for financial title operations
 * - SQL query execution
 * - Result mapping
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { injectable } from 'tsyringe';
import { db } from "@/lib/db";
import { sql, eq, and, isNull } from "drizzle-orm";
import {
  inboundInvoices,
  accountsPayable,
  accountsReceivable,
} from "@/lib/db/schema";
import { Result } from "@/shared/domain";
import {
  IFinancialTitleRepository,
  FiscalDocumentData,
  AccountPayableInsert,
  AccountReceivableInsert,
} from '../../domain/ports/output/IFinancialTitleRepository';

interface FiscalDocumentQueryResult {
  id: bigint;
  organization_id: bigint;
  branch_id: bigint;
  partner_id: bigint | null;
  partner_name: string | null;
  document_number: string;
  document_type: string;
  issue_date: Date;
  net_amount: number;
  fiscal_classification: string | null;
  financial_status: string;
}

@injectable()
export class DrizzleFinancialTitleRepository
  implements IFinancialTitleRepository
{
  async getFiscalDocumentById(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<FiscalDocumentData | null, Error>> {
    try {
      const result = await db.execute(sql`
        SELECT
          id,
          organization_id,
          branch_id,
          partner_id,
          partner_name,
          document_number,
          document_type,
          issue_date,
          net_amount,
          fiscal_classification,
          financial_status
        FROM fiscal_documents
        WHERE id = ${fiscalDocumentId}
          AND organization_id = ${organizationId}
          AND deleted_at IS NULL
      `);

      const rows = (result.recordset || result) as unknown as FiscalDocumentQueryResult[];

      if (rows.length === 0) {
        return Result.ok(null);
      }

      const row = rows[0];

      const document: FiscalDocumentData = {
        id: row.id,
        organizationId: row.organization_id,
        branchId: row.branch_id,
        partnerId: row.partner_id,
        partnerName: row.partner_name,
        documentNumber: row.document_number,
        documentType: row.document_type,
        issueDate: row.issue_date,
        netAmount: row.net_amount,
        fiscalClassification: row.fiscal_classification,
        financialStatus: row.financial_status,
      };

      return Result.ok(document);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao buscar documento fiscal: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async createAccountPayable(
    data: AccountPayableInsert
  ): Promise<Result<bigint, Error>> {
    try {
      const now = new Date();

      await db.execute(sql`
        INSERT INTO accounts_payable (
          organization_id,
          branch_id,
          partner_id,
          fiscal_document_id,
          description,
          document_number,
          issue_date,
          due_date,
          amount,
          amount_paid,
          discount,
          interest,
          fine,
          status,
          origin,
          created_by,
          updated_by,
          created_at,
          updated_at,
          version
        ) VALUES (
          ${data.organizationId},
          ${data.branchId},
          ${data.partnerId},
          ${data.fiscalDocumentId},
          ${data.description},
          ${data.documentNumber},
          ${data.issueDate},
          ${data.dueDate},
          ${data.amount},
          ${data.amountPaid},
          ${data.discount},
          ${data.interest},
          ${data.fine},
          ${data.status},
          ${data.origin},
          ${data.createdBy},
          ${data.updatedBy},
          ${now},
          ${now},
          1
        )
      `);

      // Buscar ID da conta criada
      const idResult = await db.execute(sql`
        SELECT TOP 1 id
        FROM accounts_payable
        WHERE fiscal_document_id = ${data.fiscalDocumentId}
          AND organization_id = ${data.organizationId}
        ORDER BY id DESC
      `);

      const rows = (idResult.recordset || idResult) as unknown as { id: bigint }[];
      const payableId = rows[0].id;

      return Result.ok(payableId);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao criar conta a pagar: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async createAccountReceivable(
    data: AccountReceivableInsert
  ): Promise<Result<bigint, Error>> {
    try {
      const now = new Date();

      await db.execute(sql`
        INSERT INTO accounts_receivable (
          organization_id,
          branch_id,
          partner_id,
          fiscal_document_id,
          description,
          document_number,
          issue_date,
          due_date,
          amount,
          amount_received,
          discount,
          interest,
          fine,
          status,
          origin,
          created_by,
          updated_by,
          created_at,
          updated_at,
          version
        ) VALUES (
          ${data.organizationId},
          ${data.branchId},
          ${data.partnerId},
          ${data.fiscalDocumentId},
          ${data.description},
          ${data.documentNumber},
          ${data.issueDate},
          ${data.dueDate},
          ${data.amount},
          ${data.amountReceived},
          ${data.discount},
          ${data.interest},
          ${data.fine},
          ${data.status},
          ${data.origin},
          ${data.createdBy},
          ${data.updatedBy},
          ${now},
          ${now},
          1
        )
      `);

      // Buscar ID da conta criada
      const idResult = await db.execute(sql`
        SELECT TOP 1 id
        FROM accounts_receivable
        WHERE fiscal_document_id = ${data.fiscalDocumentId}
          AND organization_id = ${data.organizationId}
        ORDER BY id DESC
      `);

      const rows = (idResult.recordset || idResult) as unknown as { id: bigint }[];
      const receivableId = rows[0].id;

      return Result.ok(receivableId);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao criar conta a receber: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async updateFiscalDocumentFinancialStatus(
    fiscalDocumentId: bigint,
    status: 'NO_TITLE' | 'GENERATED',
    organizationId: bigint
  ): Promise<Result<void, Error>> {
    try {
      await db
        .update(inboundInvoices)
        .set({
          financialStatus: status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inboundInvoices.id, Number(fiscalDocumentId)),
            eq(inboundInvoices.organizationId, Number(organizationId))
          )
        );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao atualizar status do documento: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async hasPaidTitles(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<boolean, Error>> {
    try {
      const paidPayableResult = await db.execute(sql`
        SELECT TOP 1 id
        FROM accounts_payable
        WHERE fiscal_document_id = ${fiscalDocumentId}
          AND organization_id = ${organizationId}
          AND status IN ('PAID', 'PARTIAL')
          AND deleted_at IS NULL
      `);

      const paidReceivableResult = await db.execute(sql`
        SELECT TOP 1 id
        FROM accounts_receivable
        WHERE fiscal_document_id = ${fiscalDocumentId}
          AND organization_id = ${organizationId}
          AND status IN ('RECEIVED', 'PARTIAL')
          AND deleted_at IS NULL
      `);

      const paidPayableRows = (paidPayableResult.recordset ||
        paidPayableResult) as unknown as { id: bigint }[];
      const paidReceivableRows = (paidReceivableResult.recordset ||
        paidReceivableResult) as unknown as { id: bigint }[];

      const hasPaid = paidPayableRows.length > 0 || paidReceivableRows.length > 0;

      return Result.ok(hasPaid);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao verificar títulos pagos: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }

  async reverseTitles(
    fiscalDocumentId: bigint,
    organizationId: bigint
  ): Promise<Result<void, Error>> {
    try {
      const now = new Date();

      // Soft delete em accounts_payable
      await db.execute(sql`
        UPDATE accounts_payable
        SET deleted_at = ${now}
        WHERE fiscal_document_id = ${fiscalDocumentId}
          AND organization_id = ${organizationId}
          AND deleted_at IS NULL
      `);

      // Soft delete em accounts_receivable
      await db.execute(sql`
        UPDATE accounts_receivable
        SET deleted_at = ${now}
        WHERE fiscal_document_id = ${fiscalDocumentId}
          AND organization_id = ${organizationId}
          AND deleted_at IS NULL
      `);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new Error(
          `Erro ao reverter títulos: ${
            error instanceof Error ? error.message : 'Unknown'
          }`
        )
      );
    }
  }
}

