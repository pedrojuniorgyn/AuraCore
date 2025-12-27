import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * 🔄 POST /api/fiscal/documents/:id/reclassify
 * 
 * Reclassifica automaticamente um documento fiscal usando a lógica corrigida
 */
export async function POST(
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

    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);

    // Buscar documento
    const result = await db.execute(sql`
      SELECT 
        id,
        document_type AS documentType,
        partner_document AS partnerDocument,
        xml_content AS xmlContent
      FROM fiscal_documents
      WHERE id = ${documentId}
        AND organization_id = ${session.user.organizationId}
        AND deleted_at IS NULL
    `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const document = result.recordset[0];

    if (!document.xmlContent) {
      return NextResponse.json({ error: "Documento sem XML para reclassificar" }, { status: 400 });
    }

    // Parse XML novamente
    const { parseNFeXML } = await import("@/services/nfe-parser");
    const { classifyNFe, getFiscalStatusFromClassification } = await import("@/services/fiscal-classification-service");

    // Buscar branch
    const branchResult = await db.execute(sql`
      SELECT document FROM branches WHERE id = 1
    `);

    if (branchResult.recordset.length === 0) {
      return NextResponse.json({ error: "Filial não encontrada" }, { status: 404 });
    }

    const branchCNPJ = branchResult.recordset[0].document;

    // Parse NFe
    const parsedNFe = await parseNFeXML(document.xmlContent);

    // Reclassificar
    const newClassification = classifyNFe(parsedNFe, branchCNPJ);
    const newFiscalStatus = getFiscalStatusFromClassification(newClassification);

    // Atualizar no banco
    const userId = parseInt(session.user.id, 10);
    
    await db.execute(sql`
      UPDATE fiscal_documents
      SET 
        fiscal_classification = ${newClassification},
        fiscal_status = ${newFiscalStatus},
        operation_type = ${newClassification === "SALE" ? "SAIDA" : "ENTRADA"},
        updated_at = GETDATE(),
        updated_by = ${userId}
      WHERE id = ${documentId}
    `);

    return NextResponse.json({
      success: true,
      oldClassification: document.fiscalClassification,
      newClassification,
      newFiscalStatus,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao reclassificar documento:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

