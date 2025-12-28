import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  fiscalDocuments,
  fiscalDocumentItems,
  journalEntries,
  journalEntryLines,
} from "@/lib/db/schema/accounting";
import { accountsPayable, accountsReceivable } from "@/lib/db/schema";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
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

    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    
    // 1. Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, documentId),
          eq(fiscalDocuments.organizationId, ctx.organizationId),
          isNull(fiscalDocuments.deletedAt)
        )
      );
    
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    // Data scoping por filial do próprio documento
    if (!hasAccessToBranch(ctx, Number(document.branchId))) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem acesso à filial do documento" },
        { status: 403 }
      );
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
    let journalLines: any[] = [];
    
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao buscar detalhes do documento:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    
    const body = await request.json();
    const {
      fiscalClassification,
      fiscalStatus,
      accountingStatus,
      financialStatus,
      notes,
      version,
    } = body ?? {};
    
    // Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, documentId),
          eq(fiscalDocuments.organizationId, ctx.organizationId),
          isNull(fiscalDocuments.deletedAt)
        )
      );
    
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    if (!hasAccessToBranch(ctx, Number(document.branchId))) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem acesso à filial do documento" },
        { status: 403 }
      );
    }
    
    // Validar se pode editar
    if (document.accountingStatus === "POSTED") {
      return NextResponse.json(
        { error: "Documento já contabilizado. Reverta antes de editar." },
        { status: 400 }
      );
    }

    // Optimistic Lock obrigatório para evitar "last write wins"
    if (version === undefined || version === null) {
      return NextResponse.json(
        { error: "Informe version para atualizar (optimistic lock)" },
        { status: 400 }
      );
    }
    if (Number(version) !== Number(document.version)) {
      return NextResponse.json(
        {
          error: "Conflito de versão",
          code: "VERSION_CONFLICT",
          currentVersion: document.version,
          sentVersion: version,
        },
        { status: 409 }
      );
    }
    
    // Atualizar documento
    const updateResult = await db
      .update(fiscalDocuments)
      .set({
        fiscalClassification: fiscalClassification ?? document.fiscalClassification,
        fiscalStatus: fiscalStatus ?? document.fiscalStatus,
        accountingStatus: accountingStatus ?? document.accountingStatus,
        financialStatus: financialStatus ?? document.financialStatus,
        notes: notes ?? document.notes,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        version: document.version + 1,
      })
      .where(and(eq(fiscalDocuments.id, documentId), eq(fiscalDocuments.version, document.version)));

    // Detectar corrida (TOCTOU): se outra requisição atualizou antes, nosso UPDATE afeta 0 linhas.
    const rowsAffectedRaw = (updateResult as any)?.rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json(
        {
          error: "Conflito de versão",
          code: "VERSION_CONFLICT",
          currentVersion: document.version,
          sentVersion: version,
        },
        { status: 409 }
      );
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
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao atualizar documento:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

    const ctx = await getTenantContext();
    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    
    // Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, documentId),
          eq(fiscalDocuments.organizationId, ctx.organizationId),
          isNull(fiscalDocuments.deletedAt)
        )
      );
    
    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    if (!hasAccessToBranch(ctx, Number(document.branchId))) {
      return NextResponse.json(
        { error: "Forbidden", message: "Sem acesso à filial do documento" },
        { status: 403 }
      );
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao excluir documento:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

