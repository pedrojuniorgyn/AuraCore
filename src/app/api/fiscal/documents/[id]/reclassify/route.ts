/**
 * 🔄 POST /api/fiscal/documents/:id/reclassify
 * 
 * Reclassifica automaticamente um documento fiscal
 * 
 * @since E9 Fase 2 - Migrado para IFiscalClassificationGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { db, getFirstRow, getDbRows } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { FISCAL_TOKENS } from "@/modules/fiscal/infrastructure/di/FiscalModule";
import type { IFiscalClassificationGateway } from "@/modules/fiscal/domain/ports/output/IFiscalClassificationGateway";
import { Result } from "@/shared/domain";

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
        xml_content AS xmlContent,
        fiscal_classification AS fiscalClassification
      FROM fiscal_documents
      WHERE id = ${documentId}
        AND organization_id = ${session.user.organizationId}
        AND deleted_at IS NULL
    `);

    const documents = getDbRows<{ id?: number; documentType?: string; partnerDocument?: string; xmlContent?: string; fiscalClassification?: string }>(result);
    
    if (documents.length === 0) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    const document = documents[0];

    if (!document.xmlContent) {
      return NextResponse.json({ error: "Documento sem XML para reclassificar" }, { status: 400 });
    }

    // Parse XML usando Domain Service
    const { NfeXmlParser } = await import("@/modules/fiscal/domain/services");

    // Buscar branch
    const branchResult = await db.execute(sql`
      SELECT document FROM branches WHERE id = 1
    `);

    const branch = getFirstRow<{ document?: string }>(branchResult);
    
    if (!branch) {
      return NextResponse.json({ error: "Filial não encontrada" }, { status: 404 });
    }

    const branchCNPJ = branch.document;
    if (!branchCNPJ) {
      return NextResponse.json({ error: "CNPJ da filial não encontrado" }, { status: 400 });
    }

    // Parse NFe usando Domain Service (async para SHA-256)
    const parseResult = await NfeXmlParser.parse(document.xmlContent);
    
    if (Result.isFail(parseResult)) {
      return NextResponse.json({ error: `Erro ao parsear NFe: ${parseResult.error}` }, { status: 400 });
    }
    
    const parsedNFe = parseResult.value;

    // Reclassificar via Gateway DI
    const classificationGateway = container.resolve<IFiscalClassificationGateway>(
      FISCAL_TOKENS.FiscalClassificationGateway
    );

    const classResult = await classificationGateway.classifyNfe({
      organizationId: session.user.organizationId,
      branchId: session.user.defaultBranchId || 1,
      nfeData: parsedNFe as unknown as Record<string, unknown>,
    });

    if (Result.isFail(classResult)) {
      return NextResponse.json({ error: classResult.error }, { status: 500 });
    }

    const newClassification = classResult.value.classification;
    const newFiscalStatus = classResult.value.fiscalStatus;

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
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao reclassificar documento:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
