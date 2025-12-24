import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fiscalDocuments, fiscalDocumentItems } from "@/lib/db/schema/accounting";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";
import { eq, and, gte, lte, desc, sql as rawSql, isNull } from "drizzle-orm";

/**
 * 📊 GET /api/fiscal/documents
 * 
 * Lista unificada de TODOS os documentos fiscais e não-fiscais
 * 
 * Filtros:
 * - type: NFE, CTE, NFSE, RECEIPT, MANUAL
 * - fiscalStatus, accountingStatus, financialStatus
 * - partnerId
 * - dateFrom, dateTo
 * - search (número, chave, parceiro)
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    
    // Query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const fiscalStatus = searchParams.get("fiscalStatus");
    const accountingStatus = searchParams.get("accountingStatus");
    const financialStatus = searchParams.get("financialStatus");
    const partnerId = searchParams.get("partnerId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const limitParam = Number(searchParams.get("limit") || "100");
    const offsetParam = Number(searchParams.get("offset") || "0");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 1000)
      : 100;
    const offset = Number.isFinite(offsetParam) ? Math.max(Math.trunc(offsetParam), 0) : 0;
    
    // Build where conditions
    const conditions: any[] = [
      eq(fiscalDocuments.organizationId, ctx.organizationId),
      eq(fiscalDocuments.branchId, branchId),
      isNull(fiscalDocuments.deletedAt),
    ];
    
    if (type) {
      conditions.push(eq(fiscalDocuments.documentType, type));
    }
    
    if (fiscalStatus) {
      conditions.push(eq(fiscalDocuments.fiscalStatus, fiscalStatus));
    }
    
    if (accountingStatus) {
      conditions.push(eq(fiscalDocuments.accountingStatus, accountingStatus));
    }
    
    if (financialStatus) {
      conditions.push(eq(fiscalDocuments.financialStatus, financialStatus));
    }
    
    if (partnerId) {
      conditions.push(eq(fiscalDocuments.partnerId, parseInt(partnerId)));
    }
    
    if (dateFrom) {
      conditions.push(gte(fiscalDocuments.issueDate, new Date(dateFrom)));
    }
    
    if (dateTo) {
      conditions.push(lte(fiscalDocuments.issueDate, new Date(dateTo)));
    }
    
    if (search) {
      // Busca por número, chave ou parceiro
      conditions.push(
        rawSql`(
          ${fiscalDocuments.documentNumber} LIKE ${`%${search}%`} OR
          ${fiscalDocuments.accessKey} LIKE ${`%${search}%`} OR
          ${fiscalDocuments.partnerName} LIKE ${`%${search}%`}
        )`
      );
    }

    const [{ count }] = await db
      .select({ count: rawSql<number>`count(*)`.as("count") })
      .from(fiscalDocuments)
      .where(and(...conditions));
    const total = Number(count ?? 0);

    const documents = await db
      .select()
      .from(fiscalDocuments)
      .where(and(...conditions))
      .orderBy(desc(fiscalDocuments.issueDate))
      .offset(offset)
      .limit(limit);
    
    return NextResponse.json({
      data: documents,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar documentos fiscais:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * 📝 POST /api/fiscal/documents
 * 
 * Criar documento fiscal manual (recibo, nota manual)
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);
    
    const body = await request.json();
    
    const {
      documentType, // RECEIPT, MANUAL
      documentNumber,
      documentSeries,
      partnerId,
      issueDate,
      dueDate,
      grossAmount,
      taxAmount,
      netAmount,
      fiscalClassification,
      notes,
      items, // Array de itens
    } = body;
    
    // Validações
    if (!documentType || !documentNumber || !issueDate || !netAmount) {
      return NextResponse.json(
        { error: "Campos obrigatórios: documentType, documentNumber, issueDate, netAmount" },
        { status: 400 }
      );
    }

    const created = await withMssqlTransaction(async (tx) => {
      // Inserir documento (tabela contábil)
      const insertDoc = await tx
        .request()
        .input("orgId", sql.BigInt, ctx.organizationId)
        .input("branchId", sql.BigInt, branchId)
        .input("documentType", sql.VarChar(20), String(documentType))
        .input("documentNumber", sql.VarChar(50), String(documentNumber))
        .input("documentSeries", sql.VarChar(10), documentSeries || null)
        .input("partnerId", sql.BigInt, partnerId ? Number(partnerId) : null)
        .input("issueDate", sql.DateTime, new Date(issueDate))
        .input("dueDate", sql.DateTime, dueDate ? new Date(dueDate) : null)
        .input("grossAmount", sql.Decimal(18, 2), Number(grossAmount ?? netAmount))
        .input("taxAmount", sql.Decimal(18, 2), Number(taxAmount ?? 0))
        .input("netAmount", sql.Decimal(18, 2), Number(netAmount))
        .input("fiscalClassification", sql.VarChar(50), fiscalClassification || "OTHER")
        .input("operationType", sql.VarChar(20), fiscalClassification === "PURCHASE" ? "ENTRADA" : "SAIDA")
        .input("notes", sql.NVarChar(sql.MAX), notes ?? null)
        .input("createdBy", sql.NVarChar(255), ctx.userId)
        .input("updatedBy", sql.NVarChar(255), ctx.userId)
        .query(
          `
          INSERT INTO fiscal_documents (
            organization_id, branch_id,
            document_type, document_number, document_series,
            partner_id,
            issue_date, due_date,
            gross_amount, tax_amount, net_amount,
            fiscal_classification, operation_type,
            fiscal_status, accounting_status, financial_status,
            notes,
            editable, imported_from,
            created_at, updated_at, deleted_at,
            created_by, updated_by, version
          )
          OUTPUT INSERTED.*
          VALUES (
            @orgId, @branchId,
            @documentType, @documentNumber, @documentSeries,
            @partnerId,
            @issueDate, @dueDate,
            @grossAmount, @taxAmount, @netAmount,
            @fiscalClassification, @operationType,
            'CLASSIFIED', 'CLASSIFIED', 'NO_TITLE',
            @notes,
            1, 'MANUAL',
            GETDATE(), GETDATE(), NULL,
            @createdBy, @updatedBy, 1
          )
        `
        );

      const newDoc = insertDoc.recordset?.[0];
      if (!newDoc?.id) throw new Error("Falha ao criar fiscal_document");

      if (items && Array.isArray(items) && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await tx
            .request()
            .input("docId", sql.BigInt, newDoc.id)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("itemNumber", sql.Int, i + 1)
            .input("productId", sql.BigInt, item.productId ? Number(item.productId) : null)
            .input("ncmCode", sql.VarChar(10), item.ncmCode || null)
            .input("description", sql.VarChar(500), String(item.description ?? ""))
            .input("quantity", sql.Decimal(18, 4), Number(item.quantity ?? 1))
            .input("unit", sql.VarChar(10), item.unit || "UN")
            .input("unitPrice", sql.Decimal(18, 6), Number(item.unitPrice ?? 0))
            .input("grossAmount", sql.Decimal(18, 2), Number(item.grossAmount ?? item.netAmount ?? 0))
            .input("netAmount", sql.Decimal(18, 2), Number(item.netAmount ?? 0))
            .input("chartAccountId", sql.BigInt, item.chartAccountId ? Number(item.chartAccountId) : null)
            .input("categoryId", sql.BigInt, item.categoryId ? Number(item.categoryId) : null)
            .input("costCenterId", sql.BigInt, item.costCenterId ? Number(item.costCenterId) : null)
            .query(
              `
              INSERT INTO fiscal_document_items (
                fiscal_document_id, organization_id,
                item_number, product_id, ncm_code,
                description,
                quantity, unit, unit_price,
                gross_amount, net_amount,
                chart_account_id, category_id, cost_center_id,
                created_at, updated_at, deleted_at, version
              )
              VALUES (
                @docId, @orgId,
                @itemNumber, @productId, @ncmCode,
                @description,
                @quantity, @unit, @unitPrice,
                @grossAmount, @netAmount,
                @chartAccountId, @categoryId, @costCenterId,
                GETDATE(), GETDATE(), NULL, 1
              )
            `
            );
        }
      }

      return newDoc;
    });
    
    return NextResponse.json({
      success: true,
      document: created,
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar documento fiscal:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

