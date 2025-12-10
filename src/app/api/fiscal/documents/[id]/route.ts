import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fiscalDocuments,
  fiscalDocumentItems,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/schema/accounting";
import { accountsPayable, accountsReceivable } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

/**
 * 🔍 GET /api/fiscal/documents/:id
 * 
 * Detalhes completos do documento fiscal com:
 * - Dados principais
 * - Itens
 * - Lançamento contábil (se postado)
 * - Títulos financeiros (payable/receivable)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    
    // 1. Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, documentId),
          eq(fiscalDocuments.organizationId, organizationId),
          isNull(fiscalDocuments.deletedAt)
        )
      );
    
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    
    // 2. Buscar itens
    const items = await db
      .select()
      .from(fiscalDocumentItems)
      .where(
        and(
          eq(fiscalDocumentItems.fiscalDocumentId, documentId),
          isNull(fiscalDocumentItems.deletedAt)
        )
      );
    
    // 3. Buscar lançamento contábil (se existe)
    let journalEntry = null;
    let journalLines = [];
    
    if (document.journalEntryId) {
      [journalEntry] = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, document.journalEntryId));
      
      if (journalEntry) {
        journalLines = await db
          .select()
          .from(journalEntryLines)
          .where(eq(journalEntryLines.journalEntryId, journalEntry.id));
      }
    }
    
    // 4. Buscar títulos financeiros (temporariamente desabilitado até geração automática)
    const payables: any[] = []; // TODO: Implementar geração automática
    const receivables: any[] = []; // TODO: Implementar geração automática
    
    // const payables = await db
    //   .select()
    //   .from(accountsPayable)
    //   .where(
    //     and(
    //       eq(accountsPayable.fiscalDocumentId, documentId),
    //       isNull(accountsPayable.deletedAt)
    //     )
    //   );
    
    // const receivables = await db
    //   .select()
    //   .from(accountsReceivable)
    //   .where(
    //     and(
    //       eq(accountsReceivable.fiscalDocumentId, documentId),
    //       isNull(accountsReceivable.deletedAt)
    //     )
    //   );
    
    return NextResponse.json({
      document,
      items,
      accounting: {
        journalEntry,
        journalLines,
      },
      financial: {
        payables,
        receivables,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar detalhes do documento:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * ✏️ PUT /api/fiscal/documents/:id
 * 
 * Editar/Reclassificar documento fiscal
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const userId = session.user.id;
    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    
    const body = await request.json();
    
    // Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, documentId),
          eq(fiscalDocuments.organizationId, organizationId),
          isNull(fiscalDocuments.deletedAt)
        )
      );
    
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    
    // Validar se pode editar
    if (document.accountingStatus === "POSTED") {
      return NextResponse.json(
        { error: "Documento já contabilizado. Reverta antes de editar." },
        { status: 400 }
      );
    }
    
    // Atualizar documento
    await db
      .update(fiscalDocuments)
      .set({
        ...body,
        updatedBy: parseInt(userId),
        updatedAt: new Date(),
        version: document.version + 1,
      })
      .where(eq(fiscalDocuments.id, documentId));
    
    // Atualizar itens (se fornecidos)
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.id) {
          // Atualizar item existente
          await db
            .update(fiscalDocumentItems)
            .set({
              chartAccountId: item.chartAccountId,
              categoryId: item.categoryId,
              costCenterId: item.costCenterId,
              updatedAt: new Date(),
            })
            .where(eq(fiscalDocumentItems.id, item.id));
        }
      }
    }
    
    // Buscar documento atualizado
    const [updated] = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, documentId));
    
    return NextResponse.json({
      success: true,
      document: updated,
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar documento:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 🗑️ DELETE /api/fiscal/documents/:id
 * 
 * Soft delete do documento fiscal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    
    // Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, documentId),
          eq(fiscalDocuments.organizationId, organizationId),
          isNull(fiscalDocuments.deletedAt)
        )
      );
    
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    
    // Validar se pode excluir
    if (document.accountingStatus === "POSTED") {
      return NextResponse.json(
        { error: "Documento já contabilizado. Reverta antes de excluir." },
        { status: 400 }
      );
    }
    
    if (document.financialStatus !== "NO_TITLE") {
      return NextResponse.json(
        { error: "Documento possui títulos financeiros. Exclua-os antes." },
        { status: 400 }
      );
    }
    
    // Soft delete
    await db
      .update(fiscalDocuments)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(fiscalDocuments.id, documentId));
    
    return NextResponse.json({
      success: true,
      message: "Documento excluído com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro ao excluir documento:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

