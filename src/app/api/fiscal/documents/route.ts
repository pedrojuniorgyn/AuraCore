import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fiscalDocuments, fiscalDocumentItems } from "@/lib/db/schema/accounting";
import { auth } from "@/lib/auth";
import { eq, and, gte, lte, like, inArray, desc, sql as rawSql, isNull } from "drizzle-orm";

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
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    
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
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Build where conditions
    const conditions: any[] = [
      eq(fiscalDocuments.organizationId, organizationId),
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
    
    // Execute query (SQL Server - usar TOP e subquery)
    const allDocuments = await db
      .select()
      .from(fiscalDocuments)
      .where(and(...conditions))
      .orderBy(desc(fiscalDocuments.issueDate));
    
    // Aplicar paginação manualmente
    const documents = allDocuments.slice(offset, offset + limit);
    const count = allDocuments.length;
    
    return NextResponse.json({
      data: documents,
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar documentos fiscais:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const userId = session.user.id;
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    
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
    
    // Inserir documento
    await db.insert(fiscalDocuments).values({
      organizationId,
      branchId,
      documentType,
      documentNumber,
      documentSeries: documentSeries || null,
      partnerId: partnerId || null,
      issueDate: new Date(issueDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      grossAmount: grossAmount?.toString() || netAmount?.toString(),
      taxAmount: taxAmount?.toString() || "0.00",
      netAmount: netAmount?.toString(),
      fiscalClassification: fiscalClassification || "OTHER",
      operationType: fiscalClassification === "PURCHASE" ? "ENTRADA" : "SAIDA",
      fiscalStatus: "CLASSIFIED",
      accountingStatus: "CLASSIFIED",
      financialStatus: "NO_TITLE",
      notes,
      editable: true,
      importedFrom: "MANUAL",
      createdBy: parseInt(userId),
      updatedBy: parseInt(userId),
    });
    
    // Buscar documento criado
    const [newDoc] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.organizationId, organizationId),
          eq(fiscalDocuments.documentNumber, documentNumber),
          eq(fiscalDocuments.documentType, documentType)
        )
      )
      .orderBy(desc(fiscalDocuments.id))
      .limit(1);
    
    // Inserir itens (se fornecidos)
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.insert(fiscalDocumentItems).values({
          fiscalDocumentId: newDoc.id,
          organizationId,
          itemNumber: i + 1,
          productId: item.productId || null,
          ncmCode: item.ncmCode || null,
          description: item.description,
          quantity: item.quantity?.toString() || "1",
          unit: item.unit || "UN",
          unitPrice: item.unitPrice?.toString() || "0",
          grossAmount: item.grossAmount?.toString() || item.netAmount?.toString(),
          netAmount: item.netAmount?.toString(),
          chartAccountId: item.chartAccountId || null,
          categoryId: item.categoryId || null,
          costCenterId: item.costCenterId || null,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      document: newDoc,
    }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Erro ao criar documento fiscal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

